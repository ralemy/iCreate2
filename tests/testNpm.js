/**
 * Created by ralemy on 3/26/16.
 */
"use strict";
var Roomba = require("roomba").Roomba;

var bot = new Roomba({
    sp:{
        path:"/dev/cu.usbserial-DA01NXNG",
        options:{
            baudrate: 115200
        }
    },
    update_freq:200
});

bot.once("ready",function(){
    "use strict";
    console.log("spinning up");
    bot.send({ cmd: "DRIVE", data: [500, -1] });
});

bot.on("sense", function (sensors) {
    if (sensors.bump.right || sensors.bump.left) {
        console.log("bump detected");
        // stop spinning
        //bot.send({ cmd: 'DRIVE', data: [0, -1] });
    }
});
