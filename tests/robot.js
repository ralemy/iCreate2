var upnp = require("peer-upnp"),
    http = require("http"),
    server = http.createServer(),
    port = 8080;

server.listen(port);

var peer = upnp.createPeer({
	prefix:"/upnp",
	server:server
}).on("ready",function(peer){
	console.log("advertising");
	device.advertise();
}).on("close",function(peer){
	console.log("Closed");
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
    serialNumber: "1209-0000-0000-0001",
    UPC: "120900000001"
});
var service = device.createService({
	domain:"schemas-impinj-com",
	type:"SVLRobot",
	version:"1",
	implementation:{
        Start:function(){
		console.log("device start called");
            return {RetStatus:this.get("status")};    
        },
        MoveTo:function(inputs){
            this.set("location",inputs.newLocation);
            this.notify("location");
        },
        Turn:function(inputs){
            this.set("turn",inputs.newTurnValue);
            return {RetTurn:this.get("turn")};
        }
	},
	description:{
        actions:{
            Start:{
                outputs:{
                    RetStatus: "status"
                }
            },
            MoveTo:{
                inputs:{
                    newLocation:"location"
                }
            },
            Turn:{
                inputs:{
                    newTurnValue:"turn"
                },
                outputs:{
                    RetTurn: "turn"
                }
            }            
        },
        variables: {
            status: "string",
            location: "float",
            turn:"float"
        }          
	},
});

service.set("status","initial");
