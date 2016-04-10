"use strict";

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
    console.log("Service Wrapper");
    var status = service.get("status");
    if (status !== "ready")
        return "503: Service unavailable. Currently " + status;
    if (!value)
        return "400: Bad Request. value validated to zero.";
    return action(value);
}

module.exports = function(robot) {
    return {
        implementation: {
            Status: function () {
                console.log("device status called");
                return {RetStatus: this.get("status")};
            },
            MoveTo: function (inputs) {
                var self = this,
                    response = robotWrapper(this, correctLocation(inputs.newLocation), function (location) {
                        console.log("Location Actuator");
                        self.set("status", "Moving");
                        robot.moveRobot(location).then(function (locationPacket) {
                            setAndNotify(self, "location", locationPacket.rightWheel);
                        });
                        return "200:OK. Will notify location variable once robot moves " + location + " mm";
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
                        return "200:OK. Will notify turn variable once robot turns " + degrees + " degrees";
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
        }
    };
};