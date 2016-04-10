/**
 * Created by ralemy on 3/26/16.
 */

"use strict";
var serial = require("serialport");

var connection = new serial.SerialPort("/dev/cu.usbserial-DA01NXNG", {
    baudrate: 115200
}, true, function (err, result) {
    if (err)
        return console.log("port open error", err);
    connection.write([7],function(){
        console.log("reset sent");
        setTimeout(function(){
            connection.write([128, 132, 145, 0, 100, 0, 0], function () {
                console.log("wrote", arguments);
                setTimeout(function () {
                    connection.write([173], function () {
                        console.log("stop sent");
                    });
                    connection.flush();
                }, 5000);
                connection.flush();
            });
            connection.flush(function(){
                console.log("flushed",arguments);
            });
        },10000);
    });
    connection.flush();
}).on("error", function (err) {
    console.log("port error", err);
}).on("close", function () {
    console.log("port closed");
}).on("data", function (data) {
    console.log("chunk-----------");
    for (var i = 0; i < data.length; i++)
        console.log(data[i]);
    console.log("===============chunk");
    console.log(data.toString("utf8"));
});