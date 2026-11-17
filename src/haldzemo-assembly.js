import { PARTS } from './catalog.js';
import { PORTS } from './connections.js';
import { HALDZEMO_ID, haldzemoJumpers } from './haldzemo.js';

// An additive comparison, deliberately independent of the screen-replacement flow.
// Does not move, remove, rewire or rename any existing assembly.
export function appendHaldzemoComparison(input,{x=340,at=new Date().toISOString()}={}){
 const s=structuredClone(input),prefix='custom-haldzemo-';
 if(s.instances.some(i=>i.id===HALDZEMO_ID||i.id.startsWith(prefix)))throw Error('A Haldzemo comparison is already present.');
 const copy=(source,suffix,short,position,rotation=[0,0,0])=>{
  const p=PARTS[source],id=prefix+suffix;
  s.custom.push({...structuredClone(p),id,modelId:p.modelId||p.id,name:short,short,owned:false,category:'Custom',ports:structuredClone(PORTS[source])});
  s.instances.push({id,position:[x+position[0],position[1],position[2]],rotation,dimensions:[...p.dimensions]});
  s.decisions[id]='Investigate';return id;
 };
 const carrier=copy('expansion','carrier','Haldzemo · XIAO carrier',[0,14,8]);
 copy('xiao','xiao','Haldzemo · XIAO ESP32-S3',[0,22.5,-9]);
 const battery=copy('battery','battery','Haldzemo · 2500 mAh LiPo',[0,4.5,6]);
 const camera=copy('thermal','thermal','Haldzemo · thermal camera',[0,20,-75],[-90,0,0]);
 const hub=copy('haptic-hub','hub','Haldzemo · haptic hub',[0,18,100]);
 const motors=[[-60,18,8],[60,18,8],[0,18,-48],[0,18,65]].map((pos,n)=>copy('grove-haptic-1','haptic-'+n,`Haldzemo · haptic ${n+1}`,pos,n<2?[0,90,0]:[0,0,0]));
 s.instances.push({id:HALDZEMO_ID,position:[x,44,8],rotation:[0,0,0],dimensions:[...PARTS[HALDZEMO_ID].dimensions]});
 s.decisions[HALDZEMO_ID]='Investigate';s.connections.push(...haldzemoJumpers(HALDZEMO_ID,carrier));
 const cable=(suffix,from,to,bundle,length,note)=>{
  for(const [pin,color]of [['scl','#c2a81f'],['sda','#dddddd'],['vcc','#bd3030'],['gnd','#333333']])s.connections.push({id:`haldzemo-${suffix}-${pin}`,from:from+pin,to:to+pin,bundle,type:'Grove / 4-wire harness',length,color,status:'Planned',note});
 };
 cable('thermal',carrier+':i2c1-',camera+':','Haldzemo · thermal harness',150,'Carrier Grove I²C → four-wire thermal breakout cable. Match SDA/SCL, 3.3 V and GND; confirm seller-side housing and pin order. Keep the lens open and verify pull-ups.');
 cable('hub',carrier+':i2c2-',hub+':up-','Haldzemo · hub uplink',150,'Keyed 4-pin Grove cable. TCA9548A 0x70 upstream on shared I²C. 3.3 V power is a proposed path; combined current is not approved.');
 motors.forEach((id,n)=>cable('haptic-'+n,hub+`:ch${n}-`,id+':',`Haldzemo · haptic ${n+1} / CH${n}`,200,'Standard keyed Grove cable → complete DRV2605L + motor module. Enable only this 0x5A channel while addressing it, at 100 kHz. Four modules can require up to 3 W combined; check the supply before energizing.'));
 for(const [pin,to,color]of [['positive','bat+','#bd3030'],['negative','bat-','#333333']])s.connections.push({id:'haldzemo-battery-'+pin,from:battery+':'+pin,to:carrier+':'+to,type:'JST-PH pigtail',bundle:'Haldzemo · battery cable',length:80,color,status:'Planned',note:'1S 3.7 V nominal LiPo → carrier battery input only. Meter connector polarity and verify one charging path. Do not connect the cell directly to LCD VCC.'});
 const note=(part,text)=>s.notes.push({part,text,at});
 note(HALDZEMO_ID,'Fourth comparison: exact Amazon B0G8Z6NS9B. Photo-based model, not manufacturer CAD. Eleven separate nominal 100 mm female-to-male 2.54 mm jumpers; female at screen, male at carrier. Housings and bends are additional. LED, MISO and SD_CS stay open. Check 3.3 V dim operation and total power; remove both microSD cards and leave UART unused. Touch needs FT6336G firmware. Antenna selection remains outside this comparison.');
 note(hub,'Four independent haptics on CH0–CH3. The hub isolates data, not power. Supply budget must cover the camera, display, controller and up to 3 W of haptics. Verify addresses and use one haptic channel at a time.');
 note(carrier,'XIAO is seated 8.5 mm above the carrier and 17 mm toward its USB edge. Duplicate placement is editable independently; move both parts together. This wide interior is a comparison canvas, not a proposed final case.');
 s.enclosure=[Math.max(s.enclosure[0],2*(x+85)),Math.max(s.enclosure[1],60),Math.max(s.enclosure[2],250)];
 s.updatedAt=at;return s;
}
