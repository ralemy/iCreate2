"use strict";

var serial = require("serialport"),
    _ = require("lodash"),
    Emitter = require("events").EventEmitter,
    q = require("q");

var iRobot = require("./irobot"),
    iCreate = require("./../icreate");

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
        }
    }, opts);
    this.emitter = new Emitter();
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
    moveRobot: function (distance) {
        var self = this,
            resolve = false,
            oldCorrect = 0,
            chains = 0,
            coeff=1.003,
            rotation = !this.rotationPositive ? [0x7f, 0xff] : [0x80, 0];
        distance *= coeff;
        this.rotationPositive = !this.rotationPositive;
        this.chain(iRobot.DOSTREAM, 1);
        this.wait(100);
        this.on("movement", function (packet) {
            var correct = Math.floor(Math.abs(packet.rightWheel - packet.leftWheel) / 2) * 10;
            if (resolve)
                console.log("++++++++>>>> end of move", packet);
            else if (correct && correct !== oldCorrect) {
                console.log("+++++++++++++>>>>>>>>> Correcting", correct, packet);
                if (packet.rightWheel > packet.leftWheel)
                    self.chain(146, 0, 50, 0, 50 + correct);
                else
                    self.chain(146, 0, 50 + correct, 0, 50);
                oldCorrect = correct;
                chains++;
            }
            if(packet.rightWheel > distance + chains){
                console.log("stoppping",packet, distance, chains);
                resolve = true;
                self.halt();
            }
        });
        this.chain(146, 0, 50, 0, 50);
        setTimeout(function () {
            console.log("timeout");
            resolve = true;
            self.halt();
        }, 20000);
    },
    turnRobot: function (angle) {
        var defer = q.defer(),
            coeff = this.options.rotation.coefficient,
            delay = this.options.rotation.delay,
            speed = this.options.rotation.speed,
            stopAt = (angle * coeff) / 90,
            resolve = false,
            self = this;
        this.angle = 0;
        this.refTransform = {};
        this.chain(iRobot.DOSTREAM, 1);
        this.wait(100);
        this.on("movement", function (packet) {
            if (resolve === true) {
                console.log("turn_stopped ", angle, self.angle, packet.angle, stopAt);
                self.off("movement");
                defer.resolve(packet.angle * 90 / coeff);
            }
            else if (packet.angle > stopAt - delay) {
                console.log("turn_stopping ", angle, self.angle, packet.angle, stopAt);
                self.halt();
                resolve = true;
            }
        });
        this.chain(iRobot.DRIVE, 0, speed, 0, 1);
        return defer.promise;
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
