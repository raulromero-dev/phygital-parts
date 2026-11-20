import { HALDZEMO_ID, HALDZEMO } from './haldzemo.js';
import { PARTS } from './catalog.js';
import { SCREENS, MOTOR_IDS, DRIVER_IDS, PLUG_MOTOR_IDS } from './options.js';
const add=(s,id,position,rotation=[0,0,0])=>{if(!s.instances.some(i=>i.id===id))s.instances.push({id,position,rotation,dimensions:[...PARTS[id].dimensions]});};
const connect=(s,c)=>{if(!s.connections.some(x=>x.id===c.id||[x.from,x.to].sort().join('|')===[c.from,c.to].sort().join('|')))s.connections.push({type:'Header / jumper',length:150,color:'#555555',status:'Planned',note:'',...c});};
// Compare one external screen at a time. Replacing the previous candidate and
// its cables is deliberate, undoable, and leaves the onboard OLED connected.
export function addScreen(s,id){
 const screen=SCREENS.find(p=>p.id===id);if(!screen)throw Error('Unknown display');
 const ids=new Set(SCREENS.map(p=>p.id));
 s.instances=s.instances.filter(i=>!ids.has(i.id));s.connections=s.connections.filter(c=>![c.from,c.to].some(ref=>ids.has(ref.split(':')[0])));
 add(s,id,[0,screen.protocol==='spi'?35:32,8]);s.decisions[id]=screen.ready?'Investigate':'Hold';
 if(screen.protocol==='spi'){
  // Keep I²C free for the thermal camera and multiplexed haptics. These are
  // display-only assignments; do not imply touch firmware or unused MISO wiring.
  for(const [pin,header]of [['vcc','3v3'],['gnd','gnd'],['mosi','d10'],['sclk','d8'],['cs','d0'],['dc','d2'],['rst','d6'],['bl','d7']])connect(s,{id:id+'-'+pin,from:'expansion:h-'+header,to:id+':'+pin,type:id==='lcd-27579'?'Waveshare 13-pin display cable':'PH2.0 8-pin display cable',bundle:screen.short+' display cable',length:200,color:pin==='vcc'?'#bd3030':pin==='gnd'?'#333333':'#777777',note:'Proposed 3.3 V display-only wiring. Match the labelled cable contacts, not wire colors. D2 requires microSD disabled/card removed; D6/D7 require UART unused. For 27579: included GH1.25 harness female leads → eight 2.54 mm male-to-male jumpers → carrier outer female sockets. Confirm connector orientation, actual length and supply capacity. Touch and MISO are not connected.'});
 }else if(screen.ready)for(const [pin,color]of [['sda','#3679bd'],['scl','#c2a81f'],['vcc','#bd3030'],['gnd','#333333']])connect(s,{id:id+'-'+pin,from:'expansion:i2c2-'+pin,to:id+':'+pin,type:'Grove → STEMMA QT (4528)',bundle:'Display cable',length:100,color,note:'Adafruit 4528: Grove I²C → JST-SH 4-pin STEMMA QT. Black GND, red V+, blue SDA, yellow SCL. Current QT display revision, default 0x3D. Confirm actual connector orientation.'});
}
// A second controller is an architectural alternative, not an SPI peripheral.
// Preserve every existing part and conductor while comparing its physical fit.
export function addCrowPanel(s){
 const p=PARTS['crowpanel-advance-28'];
 add(s,p.id,[...p.initialPosition]);s.decisions[p.id]??='Investigate';
}
export function addPlugHaptics(s){
 // Explicitly replacing the legacy loose-motor study is undoable in the UI.
 // Inventory and notes remain intact; only its assembly instances/wires go away.
 const old=new Set([...MOTOR_IDS,...DRIVER_IDS,'motor-rail']);
 s.instances=s.instances.filter(i=>!old.has(i.id));s.connections=s.connections.filter(c=>![c.from,c.to].some(ref=>old.has(ref.split(':')[0])));
 add(s,'haptic-hub',[-70,12,0],[0,90,0]);s.decisions['haptic-hub']='Investigate';
 const cable=(bundle,from,to)=>{for(const [pin,color]of [['scl','#c2a81f'],['sda','#dddddd'],['vcc','#bd3030'],['gnd','#333333']])connect(s,{id:to+pin,from:from+pin,to:to+pin,bundle,type:'Grove / 4-wire harness',length:200,color,note:'Standard keyed Grove 4-pin cable: contact 1 yellow SCL, 2 white SDA, 3 red VCC, 4 black GND. Proposed 3.3 V power path needs current-budget review before energizing four modules. Verify actual cable continuity and routed length.'});};
 cable('Haptic hub uplink','expansion:i2c2-','haptic-hub:up-');
 PLUG_MOTOR_IDS.forEach((id,n)=>{
  add(s,id,[n%2?26:-26,25,n<2?-15:31],[0,90,0]);s.decisions[id]='Investigate';
  cable(`Haptic ${n+1} · channel ${n}`,'haptic-hub:ch'+n+'-',id+':');
 });
}
export function addHaptics(s){
 const signals=['d0','d2','d6','d7'];
 MOTOR_IDS.forEach((id,n)=>{
  const x=n%2?31:-31,z=n<2?-40:40,driver=DRIVER_IDS[n];
  add(s,id,[x,16,z]);add(s,driver,[n%2?28:-28,29,n<2?-16:18],[0,90,0]);
  s.decisions[driver]='Investigate';
  connect(s,{id:driver+'-sig',from:'expansion:h-'+signals[n],to:driver+':sig',bundle:`Motor ${n+1} control`,type:'STEMMA 3-pin → jumper (3893/3894)',note:`Channel ${n+1}: ${signals[n].toUpperCase()} → driver SIG. White signal lead; select jumper gender to fit the carrier header. D2 requires microSD disabled/card removed; D6/D7 require UART unused. Configure PWM in firmware.`});
  for(const [pin,color]of [['vcc','#bd3030'],['gnd','#333333']])connect(s,{id:driver+'-'+pin,from:'motor-rail:'+pin,to:driver+':'+pin,bundle:`Motor ${n+1} control`,type:'STEMMA 3-pin → jumper (3893/3894)',color,note:'Red V+ / black GND from a regulated 3 V distribution rail. Supply SKU, input, splitter terminals and current rating are NOT selected; do not energize this study.'});
  for(const [pin,out]of [['positive','out+'],['negative','out-']])connect(s,{id:driver+'-'+out,from:driver+':'+out,to:id+':'+pin,bundle:`Motor ${n+1} leads`,type:'Motor leads → screw terminals',length:80,note:'Clamp the owned motor leads in the installed driver output screw terminals. No soldering; verify the very fine wires are retained and strain-relieved.'});
 });
 add(s,'motor-rail',[-62,8,20]);s.decisions['motor-rail']='Hold';
 connect(s,{id:'motor-common-ground',from:'motor-rail:gnd',to:'expansion:h-gnd',bundle:'Motor common ground',note:'Connect common ground only after selecting the motor supply and distribution hardware.'});
}
export function planningIssues(s){
 const has=id=>s.instances.some(i=>i.id===id),out=[];
 const screens=SCREENS.filter(p=>has(p.id));
 const haldzemo=s.instances.filter(i=>(s.custom?.find(p=>p.id===i.id)?.modelId||i.id)===HALDZEMO_ID);
 if(haldzemo.length)out.push({title:'Haldzemo: review power and shared pins',detail:HALDZEMO.electrical+' LED, MISO, CTP_INT and SD_CS remain open; D9 carries DC and touch is polled. The included FPC is not the jumper cable. Contact housings and routed lengths need a physical check.',ids:haldzemo.map(i=>i.id)});
 if(has('crowpanel-advance-28'))out.push({title:'CrowPanel is a separate controller study',detail:'Built-in ESP32-S3 and PCB antenna; no haptic motor or external antenna socket is included. Existing XIAO connections are unchanged. Use J7 I²C GPIO15/16 for a reviewed thermal/haptic harness; verify HY2.0 mating, pin order, power and shared-bus firmware before replacing the current controller.',ids:['crowpanel-advance-28']});
 if(screens.filter(p=>p.address==='0x3D').length>1)out.push({title:'External screens share 0x3D',detail:'Use one of these displays on the shared I²C bus, or add a reviewed multiplexer.',ids:screens.map(p=>p.id)});
 for(const p of screens.filter(p=>!p.ready))out.push({title:`${p.short}: pinout and address pending`,detail:'Fit comparison only. Confirm installed header, pin order and actual I²C address; 0x3C would conflict with the onboard display.',ids:[p.id]});
 if(DRIVER_IDS.some(has))out.push({title:'Motor power design is incomplete',detail:'Four independent driver channels are planned, but the 3 V regulator, input, solderless distribution and combined stall-current budget are unresolved. The supply box remains outside the enclosure. Do not connect it to the battery or GPIO power.',ids:['motor-rail',...DRIVER_IDS]});
 if(s.instances.some(i=>i.id==='lcd-27579'&&i.dimensions[1]<10))out.push({title:'LCD depth is below the manufacturer CAD envelope',detail:'The earlier proxy reserved 8 mm; Waveshare CAD is 10 mm including rear socket and standoffs. Use Dimensions → Reset dimensions to restore it. Saved custom dimensions were preserved.',ids:['lcd-27579']});
 if(screens.some(p=>p.protocol==='spi'))out.push({title:'SPI display assignments need review',detail:'Display only: D10 MOSI, D8 SCLK, D0 CS, D2 DC, D6 reset, D7 backlight, 3V3 and GND. Disable microSD/remove its card; leave UART unused. Touch is not mapped. 27579 manufacturer CAD depth is 10 mm; 18366 depth remains provisional. Check lid clearance, cable bends and the combined power budget.',ids:screens.filter(p=>p.protocol==='spi').map(p=>p.id)});
 const plugIds=s.instances.filter(i=>PLUG_MOTOR_IDS.includes(i.id)||[...PLUG_MOTOR_IDS,'grove-haptic'].includes(s.custom?.find(p=>p.id===i.id)?.modelId)).map(i=>i.id);
 if(plugIds.length){
  out.push({title:'Plug-in haptics need a power and fit check',detail:`${plugIds.length} Grove Haptic Motor module${plugIds.length===1?'':'s'}: up to 750 mW each, ${plugIds.length*.75} W combined (about ${(plugIds.length*.75/3.3).toFixed(2)} A at 3.3 V), before the controller, display and camera. Supply capacity is unverified. Check module dimensions, mounting and cable clearance.`,ids:['haptic-hub',...plugIds]});
  out.push({title:'Select one haptic channel at a time',detail:'These modules use 0x5A. Give each motor its own TCA9548A 0x70 channel, one enabled at a time, at the module’s documented 100 kHz. Disable haptic branches before using a faster camera clock. Firmware must implement this routing.',ids:['haptic-hub',...plugIds]});
  // Validate actual edited routes, not just the presence of a hub in the scene.
  const hubIds=s.instances.filter(i=>i.id==='haptic-hub'||['haptic-hub','grove-mux'].includes(s.custom?.find(p=>p.id===i.id)?.modelId)).map(i=>i.id);
  const branches=new Set();let bad=!hubIds.length;
  for(const id of plugIds){
   const channelPins=['sda','scl'].map(pin=>s.connections.filter(c=>[c.from,c.to].includes(id+':'+pin)).map(c=>c.from===id+':'+pin?c.to:c.from));
   const match=channelPins.map((refs,i)=>refs.length===1?refs[0].match(new RegExp('^('+hubIds.join('|')+'):ch([0-7])-'+['sda','scl'][i]+'$')):null);
   if(!match[0]||!match[1]||match[0][1]!==match[1][1]||match[0][2]!==match[1][2]||branches.has(match[0]?.[1]+':'+match[0]?.[2]))bad=true;
   else branches.add(match[0][1]+':'+match[0][2]);
  }
  if(bad)out.push({title:'Haptic channel mapping is incomplete or shared',detail:'Give every motor its own hub channel, with SDA and SCL on that same channel. A passive splitter or a direct shared bus cannot independently address these fixed-address modules.',ids:['haptic-hub',...PLUG_MOTOR_IDS]});
 }
 return out;
}
