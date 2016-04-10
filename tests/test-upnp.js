"use strict";

var upnp = require("peer-upnp"),
    q = require("q");
var server = require("http").createServer();
server.listen(9090);

server.on("error", function (err) {
    console.log("error in http", err);
});
var peer = upnp.createPeer({
    prefix: "/upnp",
    server: server
}).on("ready", function (peer) {
    console.log("ready");
    peer.on("urn:schemas-impinj-com:service:SVLRobot:1", function (service) {
        console.log("SVL Robot service found", Object.keys(service), Object.keys(service.device));
        service.on("disappear", function (service) {
            console.log("service " + service.serviceType + " disappeared");
        });
        var locationDefer = q.defer();
        service.bind(function (service) {
                console.log("moving robot");
                service.MoveTo({newLocation: 500.14}, function (res) {
                    console.log("Moveto returned", res);
                    service.Turn({newTurnValue: 365}, function (res) {
                        console.log("Immediate Turn to Returned", res);
                    });
                });
                locationDefer.promise.then(function (value) {
                    console.log("location resolved with value", value);
                    service.Turn({newTurnValue: 365}, function (res) {
                        console.log("Deferred Turn to Returned", res);
                    });
                });
            })
            .on("event", function (data) {
                console.log("Receive update from SVLRobot Service: ", data);
                if (data.location)
                    locationDefer.resolve(data.location);
            });
        service.on("error", function (err) {
            console.log("service error", err);
        });
        peer.on("close", function () {
            console.log("removing listeners");
            try {
                service.removeAllListeners("event");
                console.log("removing listeners 2");
            } catch (e) {
                return e;
            }
        });
    });

}).on("close", function (peer) {
    console.log("closed");
    setTimeout(function () {
        process.exit();
    }, 1000);
}).on("error", function () {
    console.log("error", arguments);
}).start();


// close peer after 3 minutes

process.on("SIGINT", function () {
    peer.close();
});
