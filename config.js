module.exports = {
    port: "/dev/ttyUSB0",

//---------------- This must be unique for every different robot
    device:{
        uuid:"6bd5eabd-b7c8-4f7b-ae6c-a30ccdeb0001",
        deviceSerial: "1248-0000-0000-0001",
        upc: "124800000001"
    },

//    baudrate: 115200,
//    keepAlive: 200000,

//------------------------ uncomment the rotation object to change defaults for rotation
//    rotation: {
//        coefficient: 1.555, //hack to convert reported angle to actual angle
//        speed: 25, //speed of wheel turn for rotation
//        delay: 0.005 //allowing for motion stop command to reach robot in time.
//    },

//------------------------ uncomment the moveBy object to change defaults for direct movements
//    moveBy: {
//        speed: 50, // PWM for wheels, uncorrected
//        correctionTolerance: 2, //max difference between the wheel distances , in mm, before speed change
//        correctionSpeed: 10, //for each correction difference, speed goes up this much on the lagging side
//        coefficient: 1.002 //hack to increase accuracy of distance.
//    },
    httpPort: 8080, //The port is important!! it is used for stopping the service, so it must be the same as the PORT in the init.d/upnp file.
    peerPrefix: "/upnp",

};

