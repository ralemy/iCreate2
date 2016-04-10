/**
 * Created by ralemy on 3/26/16.
 */
"use strict";

var irobot = require("irobot-roomba");

var robot = new irobot.Robot("/dev/cu.usbserial-DA01NXNG");

robot.on("ready",function(){
    robot.drive(50,-1);
});

robot.on("bump", function (e) { console.log("BUMP", e); robot.drive(0,0);});
robot.on("button", function (e) { console.log("BUTTON", e); });
robot.on("cliff", function (e) { console.log("CLIFF", e); });
robot.on("ir", function (e) { console.log("IR", e); });
robot.on("mode", function (e) { console.log("MODE", e); if(e.safe === false) robot.safeMode();});
robot.on("overcurrent", function (e) { console.log("OVERCURRENT", e); });
robot.on("virtualwall", function (e) { console.log("VIRTUALWALL", e); });
robot.on("wall", function (e) { console.log("WALL", e); });
robot.on("wheeldrop", function (e) { console.log("WHEELDROP", e); });

setTimeout(function(){
    console.log("--------->halting");
    robot.halt();
},20000);