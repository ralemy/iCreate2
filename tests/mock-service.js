"use strict";
var upnp = require("peer-upnp"),
    http = require("http"),
    q = require("q"),
    Controller = require("./mockRobot"),
    robot = new Controller({
        port: "/dev/ttyUSB0"
    }),
    server = http.createServer(),
    port = 9080;

server.listen(port);

var peer = upnp.createPeer({
    prefix: "/upnp",
    server: server
}).on("ready", function (peer) {
    peer.ssdpPeer.on("search",function(st, address){
	if(st.ST.indexOf("impinj") !== -1)
    	console.log("search on ssdp",arguments);
    });
    robot.on("ready", function () {
        console.log("advertising");
        device.advertise();
    }).on("close", function () {
        console.log("Robot Serial port Closed");
    }).on("error", function (err) {
        console.log("Robot Error", err);
    });
}).on("close", function (peer) {
    console.log("Peer Closed");
    robot.close();
}).on("error", function (err) {
    console.log("Error from Peer", err);
}).on("search",function(host,address){
	if(host.ST.indexOf("impinj") !== -1)
	console.log("search on peer",arguments);
}).start();

var device = peer.createDevice({
    autoAdvertise: false,
    uuid: "6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb0001",
    productName: "iRobot",
    productVersion: "2.0",
    domain: "schemas-impinj-com",
    type: "iCreate2",
    version: "1",
    friendlyName: "Roomba",
    manufacturer: "iRobot",
    manufacturerURL: "http://www.irobot.com",
    modelName: "iCreate2",
    modelDescription: "Roomba 500 with vaccum removed for STEM projects",
    modelNumber: "1",
    modelURL: "http://www.irobot.com",
    serialNumber: "1248-0000-0000-0001",
    UPC: "120900000001"
});

function correctLocation(location) {
    location = parseInt(location) || 0;
    location = Math.max(location, 0); //negative location not supported.
    location = Math.min(location, 3000); //will take too long and robot may shut down.
    return location;
}

function setAndNotify(service, name, value) {
    service.set(name, value);
    service.notify(name);
    service.set("status", "ready");
}

function correctAngle(angle) {
    angle = parseInt(angle) || 0; //fractions of degrees are not practical;
    angle = angle % 360; // one turn is enough
    angle = angle < 0 ? 360 - angle : angle; //only counterclockwise for now;
    return angle;
}

function robotWrapper(service, value, action) {
	console.log("wrapping", value);
    var status = service.get("status");
	console.log("status",status);
    if (status !== "ready")
        return "503: Service unavailable. Currently " + status;
    if (!value)
        return "400: Bad Request. value validated to zero.";
    return action(value);
}
var service = device.createService({
    domain: "schemas-impinj-com",
    type: "SVLRobot",
    version: "1",
    implementation: {
        Status: function () {
            console.log("device start called");
            return {RetStatus: this.get("status")};
        },
        MoveTo: function (inputs) {
	console.log("moving", inputs);
            var self = this,
                response = robotWrapper(this, correctLocation(inputs.newLocation), function (location) {
                    self.set("status", "Moving");
                    robot.moveRobot(location).then(function (locationPacket) {
                        setAndNotify(self, "location", locationPacket.rightWheel);
                    });
                    return "200:OK. Will notify location variable once roboe moves " + location + " mm";
                });
            return {RetStatus: response + ". Robot.MoveTo([100-3000])"};
        },
        Turn: function (inputs) {
            var self = this,
                response = robotWrapper(this, correctAngle(inputs.newTurnValue), function (degrees) {
                    self.set("status", "Turning");
                    robot.turnRobot(degrees).then(function (angle) {
                        setAndNotify(self, "turn", angle);
                    });
                    return "200:OK. Will notify turn variable once roboe turns " + degrees + " degrees";
                });
            return {RetStatus: response + ". Robot.Turn(degrees)"};
        }
    },
    description: {
        actions: {
            Status: {
                outputs: {
                    RetStatus: "status"
                }
            },
            MoveTo: {
                inputs: {
                    newLocation: "location"
                },
                outputs: {
                    RetLocation: "status"
                }
            },
            Turn: {
                inputs: {
                    newTurnValue: "turn"
                },
                outputs: {
                    RetTurn: "turn"
                }
            }
        },
        variables: {
            status: "string",
            location: "float",
            turn: "float"
        }
    },
});

service.set("status", "ready");
