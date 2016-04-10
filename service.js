"use strict";
var upnp = require("peer-upnp"),
    http = require("http"),
    q = require("q"),
    Controller = require("./controller"),
    config = require("./config"),
    robot = new Controller(config),
    methods = require("./upnp")(robot),
    server = http.createServer(),
    deviceParams = {
        autoAdvertise: false,
        uuid: config.uuid,
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
        serialNumber: config.deviceSerial,
        UPC: config.upc
    },
    serviceParams={
        domain: "schemas-impinj-com",
        type: "SVLRobot",
        version: "1",
        implementation: methods.implementation,
        description:methods.description
    },
    httpPort = process.argv[2] === "-p" ? process.argv[3] : config.httpPort,
    peer, device, service;


function initRobot() {
    robot.on("ready", function () {
        console.log("advertising");
        device.advertise();
    }).on("close", function () {
        console.log("Robot Serial port Closed");
        service.set("status", "Robot Serial port Closed");
    }).on("error", function (err) {
        console.log("Robot Error", err);
        service.set("status", "Robot Error: " + err.message);
    });
}

server.listen(httpPort || config.httpPort || 8080);

server.on("listening", function () {
    console.log("Server Listening on " + server.address().port);
    peer = upnp.createPeer({
            prefix: config.peerPrefix || "/upnp",
            server: server
        })
        .on("ready", function () {
            initRobot();
        })
        .on("close", function (peer) {
            console.log("Peer Closed");
            service.set("status", "PeerClosed");
            robot.close();
        })
        .on("error", function (err) {
            console.log("Error from Peer", err);
            service.set("status", "Error From Peer: " + err.message);
        })
        .start();
    device = peer.createDevice(deviceParams);
    service = device.createService(serviceParams);
    service.set("status", "ready");
});

