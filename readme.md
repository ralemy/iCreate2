# Sample project to control an iRobot iCreate2 device over upnp.


## Overview:
This project demonstrates the control of an iRobot iCreate2 device using a
Raspberry PI3 that exposes robot functionality over UPNP protocol.

The user can use Node-RED contribution package to discover and control the 
iCreate2 robot.

## Hardware Components:
- The iRobot iCreate2 device, which comes with a USB to serial port
- Tested with Raspberry PI3: running raspberian Jessie
- External Battery to power the PI. tested with Duracell Coppertop Portable power battery DU7213

## Setting up Raspberry PI
- Install latest node on PI and connect it to Internet. 
    - tested with Node: 5.9.0
- clone this repo in /home/pi (or equivalent)
- `npm install`
- `sudo npm start` this will put the service.js file to run at the system restart automatically as a service
- `sudo update-rc.d upnp defaults` this will register the service to run at boot.

## Configure Device
- Edit the `config.js` file, select a uuid, serial number and upc specific for your robot.

## Run the Device
- Now you can either restart the PI, or run `sudo service upnp start` to start the service.

## Testing Installation
- **Log File:** on the PI, the service log can be found in `/var/log/robot.log`
- **Remote access** from a machine on the network that has node, run `node tests/test-upnp.js` (just needs this file and the peer-upnp package installed)

## Updating
- `git pull`

## Uninstall
- `sudo service upnp stop`
- `sudo update-rc.d -f upnp remove`
- `sudo rm /etc/init.d/upnp`
- `sudo rm /var/log/robot.log`
- remove the directory in which you cloned the git.

 
