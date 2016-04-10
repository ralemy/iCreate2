/**
 * Created by ralemy on 3/26/16.
 * testing iRobot Module
 */


var Controller = require("../controller"),
    robot = new Controller({
        port: "/dev/ttyUSB0"
    });
console.log("robot");


robot.on("packet", function (packet) {
    "use strict";
}).on("close", function () {
    "use strict";
    console.log("closed");
}).on("error", function () {
    "use strict";
    console.log("error", arguments);
}).on("movement", function (packet) {
    "use strict";
});

robot.on("ready", function () {
    "use strict";
    console.log("turning");
    robot.moveRobot(1338).then(function (packet) {
        console.log("Move returned", packet);
    }).catch(function (err) {
        console.log("Move error", err);
    });
});