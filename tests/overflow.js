/**
 * Created by ralemy on 3/31/16.
 */
var j = 0,
    i=0,
    lastJ = 0,
    overflow = 0,
    mask = 0;

setInterval(function(){
    "use strict";
    j = j-1;
    j &= 0xFF;
    if(j<0x80) j = 0xFF;
    emitJ(j);
},15);

function emitJ(j){
    "use strict";
    var k = j > 0x7f ? j-0x80-mask : j |mask;
    if(Math.abs(k-lastJ) > 0x50){
        mask +=0x80;
        k = j > 0x7f ? j-0x80-mask : j |mask;
        console.log(lastJ.toString(16),j.toString(16),k.toString(16));
    }
    else
        console.log(lastJ.toString(16),j.toString(16),k.toString(16));
    lastJ = k;
    i++;
    if(i>300)
        process.exit();
}
/*
for(var i = 0; i<10000;i++){
    j += parseInt((Math.random() * 100)+5000);
    j &= 0x7fff;
    j|=mask;
    if(Math.abs(j-lastJ)>10000){
        overflow +=1;
        mask = overflow << 15;
        console.log("mask ", mask.toString(16), j.toString(16));
        j &= 0x7fff;
        j |=mask;
    }
    lastJ = j;
    console.log((j&0x7fff).toString(16), j.toString(16));
    if(j>1000000)
        break;
}
*/
/*
for(var i = 0; i<100;i++){
    j -= 0x70;
    lastJ = j;
    console.log((j&0xffff).toString(16),j.toString(16));
    if(j>1000000)
        break;
}
*/