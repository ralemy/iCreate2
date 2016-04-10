"use strict";
var iRobot = require("./constants");
var moveCoefficient = (Math.PI * iRobot.WHEEL_DIAMETER) / iRobot.ENCODER_COUNT;
var md = {};

function Encoder(controller) {
    this.controller = controller;
}

Encoder.prototype = {
    reset: function () {
        this.ref = {Right: null, Left: null};
        this.last = {Right: null, Left: null};
        this.encoder = {Right: null, Left: null};
        this.mask = 0;
    },
    to32Bit: function (data, last) {
        var ticker = data > 0x7fff ? data - 0x8000 - this.mask : data | this.mask;
        if (Math.abs(ticker - last) > 0x5000) {
            this.mask += 0x80;
            ticker = data > 0x7fff ? data - 0x8000 - this.mask : data | this.mask;
        }
        return ticker;
    },
    stash:function(encoder,side){
        if (this.ref[side] === null)
            this.ref[side] = this.last[side] = encoder[side];
    },
    get32BitEncoder:function(packet,idx,side){
        var data = this.to32Bit((packet[idx] * 256) + packet[idx + 1], this.last[side]),
            otherSide = side === "Right" ? "Left" : "Right",
            encoder = this.encoder;
        encoder[side] = encoder[side] ? encoder[side] + data : data;
        this.stash(encoder,side);
        if(encoder[otherSide]!==null){
            this.encoder = {Right: null, Left: null};
            return encoder;
        }
        return null;
    },
    isEqual:function(current,prev){
        if(current.Right === prev.Right)
            if(current.Left === prev.Left)
                return true;
        return false;
    },
    checkMovement: function (packet, idx, side) {
        var encoder = this.get32BitEncoder(packet,idx,side);
        if(encoder && !this.isEqual(encoder,this.last)){
            this.emitMovement(encoder,this.ref);
            this.last = encoder;            
        }
    },
    emitMovement: function (encoder, old) {
        var leftMove = (encoder.Left - old.Left) * moveCoefficient,
            rightMove = (encoder.Right - old.Right) * moveCoefficient;
        this.controller.emit("movement", {
            leftWheel: leftMove,
            rightWheel: rightMove,
            angle: (rightMove - leftMove) / iRobot.WHEEL_BASE
        });
    }

};

function parseBumpWheelDrop(ldata) {
    return {
        bumpLeft: ldata & 1,
        bumpRight: ldata & 2,
        dropRight: ldata & 4,
        dropLeft: ldata & 8
    };
}

md[iRobot.bumpWheelDrops] = function (controller, packet, idx) {
    if (controller.previousBump !== packet[idx])
        controller.emit("WheelBumpDropChanged", parseBumpWheelDrop(packet[idx]));
    controller.previousBump = packet[idx];
    return idx + 1;
};

md[iRobot.encoderLeft] = function (controller, packet, idx) {
    controller.encoder.checkMovement(packet,idx,"Left");
    return idx + 2;
};

md[iRobot.encoderRight] = function (controller, packet, idx) {
    controller.encoder.checkMovement(packet,idx,"Right");
    return idx + 2;
};

md[iRobot.distance] = function (controller, packet, idx) {
    controller.distance += (packet[idx] << 8 | packet[idx + 1]);
    return idx + 2;
};

md[iRobot.angle] = function (controller, packet, idx) {
    controller.angle += (packet[idx] << 8 | packet[idx + 1]);
    return idx + 2;
};

md.Encoder = Encoder;

module.exports = md;