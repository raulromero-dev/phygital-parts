import { emptyProject } from './product-data.js';
import { PARTS, defaultState } from './catalog.js';
import { WATCH_SIGNALS, WATCH_SOURCES } from './smartwatch.js';
import { AIR_SOURCES } from './air-monitor.js';
import { addScreen, addPlugHaptics } from './planning.js';

export const EXAMPLES=[
 {id:'thermal-camera',label:'Thermal camera',selected:'thermal'},
 {id:'air-monitor',label:'Air monitor',selected:'grove-scd41'},
 {id:'wearable-haptics',label:'Wearable haptics',selected:'haptic-hub'},
 {id:'smartwatch',label:'Smartwatch',selected:'watch-display'}
];
const instance=(id,position,rotation=[0,0,0])=>({id,position,rotation,dimensions:[...PARTS[id].dimensions]});
const note=(part,text)=>({part,text,at:new Date().toISOString()});
function retainParts(state,ids){
 state.instances=state.instances.filter(p=>ids.includes(p.id));
 state.connections=state.connections.filter(c=>[c.from,c.to].every(ref=>ids.includes(ref.split(':')[0])));
 state.decisions={};
}
function includedAntenna(state,position){
 state.instances.push(instance('watch-antenna',position));
 state.connections.push({id:'included-coax',from:'xiao:rf',to:'watch-antenna:rf',type:'U.FL coax / adapter',bundle:'Included antenna coax',length:0,color:'#888888',status:'Planned',note:'Included XIAO antenna plugs into U.FL. Geometry and lead length are planning allowances; measure the actual part.'});
}
export function exampleTemplate(id){
 if(id==='smartwatch')return smartwatchTemplate();
 if(!EXAMPLES.some(example=>example.id===id))throw Error('Unknown example.');
 const state=defaultState();state.preset=id;
 if(id==='thermal-camera'){
  state.name='Thermal camera · example';state.enclosure=[78,46,144];
  state.instances.find(p=>p.id==='thermal').position=[10,19,-59];
  state.instances.find(p=>p.id==='strip').position=[0,25,64];
  addScreen(state,'lcd-27579');
  state.brief='MLX90640 thermal camera with XIAO ESP32-S3, 2.8-inch display and rechargeable battery. Proposed wiring and packaging study; firmware, thermal drift and power need review.';
  state.notes=[note('lcd-27579','Eight display conductors are mapped through the supplied 13-pin harness and male jumper adapters. Touch remains unmapped. Inspect the cable guide and review the shared pins before assembly.')];
 }else if(id==='air-monitor'){
  retainParts(state,['xiao','expansion']);state.name='Air monitor · example';state.enclosure=[92,29,76];
  state.instances.find(p=>p.id==='expansion').position=[-18,8,0];
  state.instances.find(p=>p.id==='xiao').position=[-18,16.5,-17];
  state.instances.push(instance('grove-scd41',[24,9,15]));includedAntenna(state,[23,24,-26]);
  for(const [pin,color]of [['scl','#c2a81f'],['sda','#dddddd'],['vcc','#bd3030'],['gnd','#333333']])state.connections.push({id:'air-'+pin,from:'expansion:i2c1-'+pin,to:'grove-scd41:'+pin,type:'Grove / 4-wire harness',bundle:'SCD41 Grove cable',length:100,color,status:'Planned',note:'Grove J1: 1 SCL, 2 SDA, 3 VCC, 4 GND, verified against Seeed v1.01 netlist. Proposed 3.3 V operation; check peak-current capacity and cable continuity.'});
  state.brief='USB-C-powered CO₂, temperature and humidity monitor using the carrier OLED. Prebuilt layout with a mapped Grove cable; ventilation, power and firmware need review.';
  state.notes=[note('grove-scd41',PARTS['grove-scd41'].electrical),note('xiao','Power through XIAO USB-C with a suitable cable and supply. No battery is included in this desk example. The carrier OLED is connected internally; install firmware to show readings.')];
  state.projectLinks=[AIR_SOURCES.guide,AIR_SOURCES.firmware];
 }else{
  retainParts(state,['xiao','expansion','battery']);state.name='Wearable haptics · example';state.enclosure=[150,44,176];
  state.instances.find(p=>p.id==='battery').position=[0,4.5,0];
  state.instances.find(p=>p.id==='expansion').position=[0,15,0];
  state.instances.find(p=>p.id==='xiao').position=[0,23.5,-17];
  addPlugHaptics(state);includedAntenna(state,[0,26,-76]);
  const positions={'haptic-hub':[0,34,0],'grove-haptic-1':[0,18,-54],'grove-haptic-2':[46,18,0],'grove-haptic-3':[0,18,54],'grove-haptic-4':[-46,18,0]};
  for(const [part,position]of Object.entries(positions)){const p=state.instances.find(p=>p.id===part);p.position=position;p.rotation=part==='haptic-hub'?[0,90,0]:[0,0,0];}
  state.brief='Four plug-in Grove haptic modules, one per TCA9548A channel, arranged for directional cues. A wearable layout study; power distribution, retention and firmware remain to be designed.';
  state.notes=[note('haptic-hub','Channels 0–3 correspond to front, right, back and left in the top view. Select one channel at a time. This is a distributed wearable layout, not a validated watch enclosure.'),note('battery','Battery and motor power budget remain unverified. The four module paths are planning connections, not approval to energize the carrier rail.')];
 }
 return state;
}

export function smartwatchTemplate(){
 const state=emptyProject('Smartwatch · XIAO');
 state.preset='smartwatch';state.enclosure=[48,29,48];
 state.brief='Seeed XIAO ESP32-S3 + Round Display smartwatch starter. Header connections are mapped; battery charging, adapter and final enclosure need review.';
 const placements=[['watch-round-battery',[0,3.75,0],[0,0,0]],['xiao',[0,11,-9.652],[0,0,180]],['watch-antenna',[18.5,11,0],[0,90,0]],['watch-display',[0,21,0],[0,0,0]]];
 state.instances=placements.map(([id,position,rotation])=>({id,position,rotation,dimensions:[...PARTS[id].dimensions]}));
 state.connections=WATCH_SIGNALS.map(([id,label])=>({id:'watch-header-'+id,from:'xiao:'+id,to:'watch-display:'+id,type:'Board-to-board headers',bundle:'XIAO ↔ round display',length:0,color:'#888888',status:'Planned',note:`${label}. Direct 2 × 7 header/socket connection; no jumper cable. Seeed v1.1 pin map. Choose pre-soldered XIAO headers or solder the supplied headers first.`}));
 state.connections.push({id:'watch-coax',from:'xiao:rf',to:'watch-antenna:rf',type:'U.FL coax / adapter',bundle:'Included antenna coax',length:0,color:'#888888',status:'Planned',note:'Included antenna plugs directly into XIAO U.FL. Measure the supplied lead; no RP-SMA adapter. Routing is illustrative.'});
 state.decisions={'watch-round-battery':'Hold'};
 state.notes=[{part:'watch-round-battery',at:new Date().toISOString(),text:PARTS['watch-round-battery'].electrical},{part:'watch-display',at:new Date().toISOString(),text:'Prototype envelope only. Manufacturer case STL is a reference, not a validated fit for this battery and stack. No strap, haptics, IMU, waterproofing or finished watch firmware is included.'}];
 state.projectLinks=[WATCH_SOURCES.firmware,WATCH_SOURCES.hardware];
 state.research={summary:state.brief,questions:['Resolve the 300 mA battery charge limit versus the board’s approximately 485 mA setting, then verify the adapter.','Measure the assembled thickness, antenna and cable route before designing the wrist case.'],sources:[{label:'Hardware & schematics',url:WATCH_SOURCES.hardware},{label:'Pin map',url:WATCH_SOURCES.guide},{label:'Open-source firmware',url:WATCH_SOURCES.firmware},{label:'Manufacturer case STL',url:WATCH_SOURCES.case}],at:new Date().toISOString()};
 return state;
}

// Only refresh the untouched, unwired battery in an existing starter. Keep old
// product IDs valid so imported files and user-edited layouts retain their parts.
export function upgradeWatchBattery(state){
 const old=state.instances.find(p=>p.id==='watch-battery');
 const same=(a,b)=>a.every((n,i)=>n===b[i]);
 if(state.preset!=='smartwatch'||!old||state.instances.some(p=>p.id==='watch-round-battery')||!same(old.dimensions,[29,4.75,36])||!same(old.position,[0,3.375,4])||!same(old.rotation,[0,0,0])||state.connections.some(c=>c.from.startsWith('watch-battery:')||c.to.startsWith('watch-battery:'))||state.decisions['watch-battery']!=='Hold')return false;
 old.id='watch-round-battery';old.dimensions=[...PARTS[old.id].dimensions];old.position=[0,3.75,0];
 delete state.decisions['watch-battery'];state.decisions[old.id]='Hold';
 for(const note of state.notes)if(note.part==='watch-battery'&&note.text===PARTS['watch-battery'].electrical){note.part=old.id;note.text=PARTS[old.id].electrical;}
 return true;
}
