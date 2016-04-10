"use strict";

var serial = require("serialport"),
    _ = require("lodash"),
    Emitter = require("events").EventEmitter,
    q = require("q");

var iRobot = require("./constants"),
    iCreate = require("./icreate");

function lB(word) {
    return word % 256;
}

function hB(word) {
    return Math.floor(word / 256);
}

function word(hb, lb) {
    return (hb * 256) + lb;
}

function toBytes(value) {
    var highByte = Math.floor(value / 256),
        lowByte = value % 256;
    return [highByte, lowByte];
}

function toByteBuffer(args) {
    return _.reduce(args, function (r, arg) {
        if (arg < 256)
            r.push(arg);
        else
            r.concat(toBytes(arg));
        return r;
    }, []);
}

function InputParser() {
    this.buffer = [];
    this.expectation = "Initializing";
    this.packets = [];
}

InputParser.prototype = {
    parse: function (data) {
        for (var i = 0; data[i] !== undefined;)
            i = this.consume(data, i);
    },
    searchSensorPacket: function (data, idx) {
        for (; idx < data.length; idx++)
            if (data[idx] === iRobot.STREAM_START) {
                this.buffer.push(data[idx]);
                this.expectation = "PACKET_LENGTH";
                return idx + 1;
            }
        return idx;
    },
    getPacketLength: function (data, idx) {
        this.buffer.push(data[idx]);
        this.expectation = "PACKET_BODY";
        return idx + 1;
    },
    getPacketBody: function (data, idx) {
        var expected = this.buffer[1] + 3,
            endIdx = idx + expected - this.buffer.length;
        for (var i = idx; i < endIdx; i++)
            if (data[i] !== undefined)
                this.buffer.push(data[i]);
        return this.buffer.length < expected ?
            data.length :
            this.resetBuffer(endIdx);
    },
    pause: function () {
        this.expectation = "PAUSED";
    },
    resetBuffer: function (endIdx) {
        if (this.validateBuffer())
            this.packets.push(this.buffer.slice(0, this.buffer.length - 1));
        else
            console.log("invalid buffer", this.buffer);
        this.buffer = [];
        this.expectation = "SENSOR_PACKET";
        return endIdx;
    },
    validateBuffer: function () {
        return this.buffer.length ? 0 === lB(_.reduce(this.buffer, function (r, c) {
            return r + c;
        })) : false;
    },
    consume: function (data, idx) {
        switch (this.expectation) {
            case "SENSOR_PACKET":
                return this.searchSensorPacket(data, idx);
            case "PACKET_LENGTH":
                return this.getPacketLength(data, idx);
            case "PACKET_BODY":
                return this.getPacketBody(data, idx);
        }
        return data.length;
    }
};

function Module(opts) {
    this.options = _.merge({
        port: "/dev/ttyUSB0",
        baudrate: 115200,
        keepAlive: 200000,
        rotation: {
            coefficient: 1.555, //hack to convert reported angle to actual angle
            speed: 25, //speed of wheel turn for rotation
            delay: 0.005 //allowing for motion stop command to reach robot in time.
        },
        moveBy: {
            speed: 50, // PWM for wheels, uncorrected
            correctionTolerance: 2, //max difference between the wheel distances , in mm, before speed change
            correctionSpeed: 10, //for each correction difference, speed goes up this much on the lagging side
            coefficient: 1.002 //hack to increase accuracy of distance.
        }
    }, opts);
    this.emitter = new Emitter();
    this.encoder = new iCreate.Encoder(this);
    this.open();
}

Module.prototype = {
    emitter: null,
    channel: null,
    commandChain: null,
    keepAlive: null,
    previousBump: 0,
    distance: 0,
    angle: 0,
    oldTransform: {},
    refTransform: {},
    transformCache: {},
    watchdog: false,
    open: function () {
        var defer = q.defer(),
            self = this;
        this.parser = new InputParser();
        this.channel = new serial.SerialPort(this.options.port, {
            baudrate: this.options.baudrate
        }, true, function (err) {
            if (err)
                defer.reject(err);
            else
                defer.resolve(self);
        }).on("close", function () {
            self.emitter.emit("close");
        }).on("error", function (err) {
            self.emitter.emit("error", err);
        }).on("data", function (data) {
            self.watchdog = true;
            self.parser.parse(data);
            _.each(self.parser.packets, function (packet) {
                self.parsePacketGroup(packet);
            });
            self.parser.packets = [];
        });
        this.commandChain = defer.promise.then(function (response) {
            self.keepAlive = setInterval(function () {
                if (!self.watchdog)
                    self.initRobot();
                self.watchdog = false;
            }, self.options.keepAlive);
            return self.initRobot();
        }).then(function () {
            console.log("Ready");
            self.emitter.emit("ready");
        }).catch(function (err) {
            self.emitter.emit("error", err);
        });
    },
    parsePacketGroup: function (packet) {
        for (var i = 2; packet[i] !== undefined;) {
            if (iCreate[packet[i]])
                i = iCreate[packet[i]](this, packet, i + 1);
            else
                console.log("unknown packet", packet, i, packet[i], i = packet.length);
        }

    },
    close: function () {
        if (this.keepAlive)
            clearInterval(this.keepAlive);
        this.keepAlive = null;
        if (this.channel)
            this.channel.close();
        this.channel = null;
    },
    on: function (evt, cb) {
        var self = this;
        this.emitter.on(evt, function (e) {
            cb.call(self, e);
        });
        return this;
    },
    off: function (evt) {
        this.emitter.removeAllListeners(evt);
        return this;
    },
    emit: function () {
        this.emitter.emit.apply(this.emitter, arguments);
    },
    chain: function () {
        var args = Array.prototype.slice.call(arguments, 0),
            buffer = toByteBuffer(args),
            defer = q.defer(),
            self = this;
        this.commandChain = this.commandChain.then(function () {
            console.log("chaining", args);
            self.channel.write(buffer, defer.makeNodeResolver());
            self.channel.flush();
            return defer.promise;
        });
        return this.commandChain;
    },
    wait: function (timeout) {
        var defer = q.defer();
        this.commandChain = this.commandChain.then(function () {
            setTimeout(defer.resolve, timeout);
            return defer.promise;
        });
        return this.commandChain;
    },
    initRobot: function () {
        this.parser.pause();
        this.chain(iRobot.START);
        this.wait(100);
        this.chain(iRobot.SAFE);
        this.wait(100);
        this.chain(iRobot.STREAM, 5, iRobot.bumpWheelDrops, iRobot.encoderLeft, iRobot.encoderRight, iRobot.distance, iRobot.angle);
        this.wait(100);
        this.chain(iRobot.DOSTREAM, 0);
        this.wait(100);
        this.chain(iRobot.LEDS, 4, 0, 255);
        this.parser.resetBuffer();
    },
    drive: function (cmd, right, left) {
        this.chain(cmd, (right >> 8) & 0x000000ff, right & 0x000000ff, (left >> 8) & 0x000000FF, left & 0x000000FF);
    },
    shouldCorrectDistance: function (correct, old) {
        if (correct)
            if ((correct * old) <= 0)
                return true;
            else if (correct * (correct - old) > 0)
                return true;
        return false;
    },
    resetRobot: function () {
        this.chain(iRobot.DOSTREAM, 0);
        this.chain(iRobot.RESET);
    },
    speedup: function(options,correction){
        if (correction > 0)
            this.drive(iRobot.DRIVEPWM, options.speed, options.speed + correction);
        else
            this.drive(iRobot.DRIVEPWM, options.speed - correction, options.speed);
    },
    moveRobot: function (distance) {
        var self = this,
            resolve = false,
            oldCorrection = 0,
            chains = 0,
            options = this.options.moveBy,
            defer = q.defer();
        distance *= options.coefficient;
        this.encoder.reset();
        this.chain(iRobot.DOSTREAM, 1);
        this.wait(100);
        this.on("movement", function (packet) {
            var diff = packet.rightWheel - packet.leftWheel,
                correction = Math[(diff < 0 ? "ceiling" : "floor")](diff / options.correctionTolerance) *
                    options.correctionSpeed;
            if (resolve)
                defer.resolve(packet);
            else if (self.shouldCorrectDistance(correction, oldCorrection)){
                self.speedup(options,correction);
                oldCorrection = correction;
                chains++;
            }
            if (packet.rightWheel > distance + chains) {
                resolve = true;
                self.halt();
            }
        });
        this.drive(iRobot.DRIVEPWM, options.speed, options.speed);
        return defer.promise.then(function(){
            self.off("movement");
        });
    },
    turnRobot: function (angle) {
        var defer = q.defer(),
            options = this.options.rotation,
            stopAt = (angle * options.coefficient) / 90,
            resolve = false,
            self = this;
        this.angle = 0;
        this.encoder.reset();
        this.chain(iRobot.DOSTREAM, 1);
        this.wait(100);
        this.on("movement", function (packet) {
            if (resolve === true)
                 defer.resolve(packet.angle * 90 / options.coefficient);
            else if (packet.angle > stopAt - options.delay) {
                resolve = true;
                self.halt();
            }
        });
        this.chain(iRobot.DRIVE, 0, options.speed, 0, 1);
        return defer.promise.then(function(){
            self.off("movement");
        });
    },
    halt: function () {
        this.chain(iRobot.DRIVE, 0, 0, 0, 0);
        this.chain(iRobot.DOSTREAM, 0);
    },
    leaveRobot: function () {
        return this.chain(iRobot.STOP);
    }
};

module.exports = Module;
