/**
 * Created by ralemy on 3/27/16.
 * A module to emulate the irobot behaviour
 */
"use strict";

var Emitter = require("events").EventEmitter,
    q = require("q");

function MockRobot(options) {
    console.log("Mocked Robot instantiated");
    this.emitter = new Emitter();
    this.open();
}

MockRobot.prototype = {
    open: function () {
        var self = this;
        setTimeout(function () {
            console.log("Mock Robot now Ready");
            self.emitter.emit("ready");
        },2000);
    },
    close:function(){
        console.log("Mock Robot now closed");
    },
    on:function(){
        this.emitter.on.apply(this.emitter,arguments);
        return this;
    },
    moveRobot:function(distance){
        var defer = q.defer();
        console.log("Staring to move " + distance);
        setTimeout(function(){
            console.log("Moved "+ distance + "mm");
            defer.resolve({rightWheel:distance + 198});
        },2000);
        return defer.promise;
    },
    turnRobot:function(angle){
        var defer = q.defer();
        console.log("Staring to turn " + angle + " degrees");
        setTimeout(function(){
            console.log("Turned "+ angle + " degrees");
            defer.resolve(angle + 0.45678);
        },2000);
        return defer.promise;
    }
};

module.exports = MockRobot;