import { emptyProject } from './product-data.js';
import { PARTS, defaultState } from './catalog.js';
import { WATCH_SIGNALS, WATCH_SOURCES } from './smartwatch.js';
import { AIR_SOURCES } from './air-monitor.js';
import { addScreen, addPlugHaptics } from './planning.js';
import { ringInstances, RING_SOURCE } from './smart-ring.js';
import { CYBERDECK_SOURCES } from './cyberdeck.js';

export const EXAMPLES=[
 {id:'phygital',label:'Phygital',selected:'thermal'},
 {id:'thermal-camera',label:'Thermal camera',selected:'thermal'},
 {id:'air-monitor',label:'Air monitor',selected:'grove-scd41'},
 {id:'wearable-haptics',label:'Wearable haptics',selected:'haptic-hub'},
 {id:'smartwatch',label:'Smartwatch',selected:'watch-display'},
 {id:'smart-ring',label:'Smart ring',selected:'ring-board'},
 {id:'makeup-cyberdeck',label:'Makeup cyberdeck',selected:'cardputer-adv'}
];
export const PHYGITAL_LAYOUTS=[
 {id:'compact',label:'Compact study',description:'Stacked battery · strip antenna'},
 {id:'bench',label:'Bench prototype',description:'Original carrier · external antenna'},
 {id:'wide',label:'Side by side',description:'Wider footprint · less stacking'}
];
export function phygitalTemplate(preset='compact'){
 if(!PHYGITAL_LAYOUTS.some(layout=>layout.id===preset))throw Error('Unknown Phygital layout.');
 const state=defaultState(preset==='bench'?'bench':'compact');state.preset=preset;
 if(preset==='wide'){
  state.name='Side-by-side study';state.enclosure=[150,38,122];
  const positions={battery:[-36,4.5,6],expansion:[34,8,10],xiao:[34,16.5,-7],thermal:[20,15,-48],strip:[-35,19,-48]};
  for(const [id,position]of Object.entries(positions))state.instances.find(p=>p.id===id).position=position;
 }
 state.brief='Original Phygital unwanted-device detection hardware layout. XIAO and expansion carrier, thermal camera, battery and antenna. Fit and wiring remain planning references.';
 state.projectLinks=['https://github.com/raulromero-dev/phygital'];return state;
}
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
 if(id==='phygital')return phygitalTemplate();
 if(id==='makeup-cyberdeck')return makeupCyberdeckTemplate();
 if(id==='smart-ring')return smartRingTemplate();
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

export function makeupCyberdeckTemplate(){
 const state=emptyProject('Makeup cyberdeck · compact');state.preset='makeup-cyberdeck';state.enclosure=[106,96,112];state.enclosureVisible=false;
 state.instances=[instance('cardputer-adv',[0,13.35,14.5]),instance('compact-base',[0,12,15]),instance('compact-hinge',[0,25,-20]),instance('compact-lid',[0,55.8,-34.4],[65,0,0]),instance('compact-mirror',[0,57.7,-31.5],[65,0,0])];
 state.connections=[];state.brief='Makeup-compact cyberdeck: an integrated Cardputer-Adv in a blush clamshell cradle with a mirrored lid. Screen, keyboard and battery are internal; the case is a concept.';
 state.notes=[note('cardputer-adv','Display, keyboard and battery are integrated. Inspect Pins & internals for their mapping; no invented external jumper cables are required.'),note('compact-base','Open-position styling study only. Validate closed clearance, port access, hinge hardware, antenna clearance and retention before fabrication.')];
 state.projectLinks=[CYBERDECK_SOURCES.guide,CYBERDECK_SOURCES.cad,CYBERDECK_SOURCES.firmware];return state;
}

export function smartRingTemplate(){
 const state=emptyProject('Smart ring · SenseRing');state.preset='smart-ring';state.enclosure=[36,16,36];state.enclosureVisible=false;
 state.instances=ringInstances();state.decisions={'ring-battery':'Hold','ring-board':'Investigate'};
 state.connections=[['positive','bat+','#bd3030'],['negative','bat-','#333333']].map(([pin,pad,color])=>({id:'ring-'+pin,from:'ring-battery:'+pin,to:'ring-board:'+pad,type:'Soldered battery tabs',bundle:'Battery tabs · solder required',length:0,color,status:'Planned',note:'Upstream BAT+/BAT− pad mapping. Physical tab positions, charge configuration and polarity need review. No plug-in cable or completed circuit is implied.'}));
 state.brief='Open SenseRing assembly with reused board, curved battery and shell CAD. Fine-pitch fabrication and soldering are required; this is an editable hardware reference.';
 state.notes=[note('ring-board','Open-source reference, not a ready-made retail kit. Generate and review fabrication outputs, implement firmware and validate fit. No health or medical accuracy is claimed.'),note('ring-battery',PARTS['ring-battery'].electrical)];
 state.projectLinks=[RING_SOURCE];return state;
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
