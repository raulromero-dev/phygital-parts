import { CROWPANEL_PORTS, CROWPANEL_INTERNALS } from './crowpanel.js';
import carrierContacts from './carrier-contacts.js';
import { PLUG_MOTOR_IDS } from './options.js';
// Header order follows Seeed's CAD; unknown seller connector order stays explicit.
// Anchors are normalized proxy coordinates for routing, not PCB CAD coordinates.
const port=(id,label,signal,group,anchor=[0,0,0],rail=null)=>({id,label,signal,group,anchor,rail});
const i2c=(prefix,group,anchor=[1,0,0])=>[
 port(prefix+'sda','SDA','sda',group,anchor),port(prefix+'scl','SCL','scl',group,anchor),
 port(prefix+'vcc','VCC · verify rail','power',group,anchor,'unknown'),port(prefix+'gnd','GND','ground',group,anchor,'0')];
export const PORTS={
 xiao:[...[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,43],[7,44],[8,7],[9,8],[10,9]].map(([d,g])=>port('d'+d,`D${d} / GPIO${g}${d===4?' · SDA':d===5?' · SCL':d===1?' · button':d===3?' · buzzer':''}`,d===4?'sda':d===5?'scl':d===6?'tx':d===7?'rx':'gpio','Headers',[d<6?-1:1,0,(d%6)/3-.8],'3.3')),
  port('3v3','3V3','power','Power',[1,0,-.7],'3.3'),port('gnd','GND','ground','Power',[1,0,-.4],'0'),port('5v','5V / VBUS','power','Power',[1,0,-1],'5'),port('bat+','BAT+ pad','power','Battery pads',[-.3,-1,0],'cell'),port('bat-','BAT− pad','ground','Battery pads',[.3,-1,0],'0'),port('rf','U.FL · 2.4 GHz','rf','Antenna',[.8,1,.7]),port('usb','USB-C','usb','USB',[-.4,.6,-1])],
 expansion:[...i2c('i2c1-','Grove I²C 1',[1,0,-.5]),...i2c('i2c2-','Grove I²C 2',[1,0,.5]),port('bat+','Battery + · verify','power','Battery socket',[-.6,-.3,1],'cell'),port('bat-','Battery − · verify','ground','Battery socket',[-.6,-.3,1],'0'),port('uart-tx','TX / D6','tx','Grove UART',[.2,0,1],'3.3'),port('uart-rx','RX / D7','rx','Grove UART',[.2,0,1],'3.3'),port('uart-vcc','VCC · verify rail','power','Grove UART',[.2,0,1],'unknown'),port('uart-gnd','GND','ground','Grove UART',[.2,0,1],'0'),port('a0','A0 / D0','gpio','Analog / digital',[-1,0,.5],'3.3'),port('analog-spare','Second signal · unverified','unknown','Analog / digital',[-1,0,.5]),port('analog-vcc','VCC · verify rail','power','Analog / digital',[-1,0,.5],'unknown'),port('analog-gnd','GND','ground','Analog / digital',[-1,0,.5],'0'),port('3v3','3V3 header','power','Headers',[-1,0,0],'3.3'),port('gnd','GND header','ground','Headers',[-1,0,.3],'0')],
 thermal:i2c('','Breakout · physical pin order unverified',[.6,-.4,.7]),
 battery:[port('positive','Pack + · meter polarity','power','JST-PH 2.0',[.4,0,-1],'cell'),port('negative','Pack − · meter polarity','ground','JST-PH 2.0',[-.4,0,-1],'0')],
 rod:[port('rf','RP-SMA feed via U.FL pigtail','rf','Antenna feed',[0,0,1])],
 strip:[port('rf','RF feed · confirm U.FL variant','rf','Antenna feed',[-1,0,0])],
 rf:[port('in','RF IN · SMA','rf','RF input',[-1,0,0]),port('out','VOUT · measure range','analog','Detector output',[1,0,0],'unknown'),port('supply','Supply · board unverified','power','Power',[0,0,-1],'unknown'),port('gnd','GND','ground','Power',[.3,0,-1],'0'),port('vset','VSET · mode dependent','analog','Control',[1,0,.4],'unknown')],
 motor:[port('positive','Motor + lead','motor','Motor leads',[.3,0,-1]),port('negative','Motor − lead','motor','Motor leads',[-.3,0,-1])],
 driver:[...i2c('','Driver breakout',[0,0,-1]),port('out+','OUT+','motor','Motor output',[.3,0,1]),port('out-','OUT−','motor','Motor output',[-.3,0,1]),port('trigger','IN / TRIG · confirm breakout','gpio','Control',[-1,0,0],'3.3')],
 charger:[port('in','Input +5V','power','Input',[-1,0,0],'5'),port('gnd','GND','ground','Common',[-1,0,.3],'0'),port('bat+','BAT+','power','Battery',[1,0,.4],'cell'),port('bat-','BAT−','ground','Battery',[1,0,.7],'0'),port('load+','System / load + · verify','power','Load',[1,0,-.5],'unknown'),port('load-','System / load −','ground','Load',[1,0,-.8],'0')],
 jst:['A','B'].flatMap((end,e)=>[1,2].map((pin,n)=>port(`${end}${pin}`,`${end} contact ${pin} · meter continuity`,'unknown',`Cable end ${end}`,[n*.6-.3,0,e?1:-1]))),
 headers:Array.from({length:40},(_,n)=>port('p'+(n+1),`Pin ${n+1}`,'unknown','Unassigned header',[n/19.5-1,0,0])),
};
PORTS['crowpanel-advance-28']=CROWPANEL_PORTS;
PORTS.grove=['A','B'].flatMap((end,e)=>Array.from({length:4},(_,n)=>port(`${end}${n+1}`,`${end} contact ${n+1} · trace function`,'unknown',`Cable end ${end}`,[(n-1.5)/2,0,e?1:-1])));
PORTS['grove-tail']=['A','wire'].flatMap((end,e)=>Array.from({length:4},(_,n)=>port(`${end}${n+1}`,`${end} ${n+1} · trace function`,'unknown',e?'Exposed conductors':'Grove contacts',[(n-1.5)/2,0,e?1:-1])));
PORTS.jumper=[port('a','End A','unknown','Jumper',[0,0,-1]),port('b','End B','unknown','Jumper',[0,0,1])];
// USB at the top: seven contacts on each side, mirrored through the carrier
// socket. D6 is the bottom LEFT contact; D7 is the bottom RIGHT contact.
export const HEADER_ROWS=[['d0','5v'],['d1','gnd'],['d2','3v3'],['d3','d10'],['d4','d9'],['d5','d8'],['d6','d7']];
for(const [row,pair]of HEADER_ROWS.entries())for(const [side,id]of pair.entries()){
 const p=PORTS.xiao.find(p=>p.id===id);p.anchor=[side?1:-1,-.3,(row-3)*2.54/10.5];p.group=side?'Right header · USB up':'Left header · USB up';p.net=id;
 PORTS.expansion.push({...p,id:'h-'+id,label:p.label,group:`Exposed ${side?'J11 right':'J10 left'} · contact ${row+1}`,anchor:carrierContacts[`${side?'J11':'J10'}:${row+1}`].anchor});
}
// Button/buzzer labels belong to the expansion carrier, not an unmounted XIAO.
for(const p of PORTS.xiao)p.label=p.label.replace(' · button','').replace(' · buzzer','');
PORTS.xiao.find(p=>p.id==='rf').anchor=[-.76,.15,.65];
// These four-pin contact numbers are taken from the carrier's Eagle netlist.
// Geometry remains an approximate routing anchor, not a crimping drawing.
for(const prefix of ['i2c1-','i2c2-'])for(const [i,id]of ['scl','sda','vcc','gnd'].entries()){
 const p=PORTS.expansion.find(p=>p.id===prefix+id);p.anchor=carrierContacts[`${prefix==='i2c1-'?'J1':'J4'}:${i+1}`].anchor;
 p.group=prefix==='i2c1-'?'Grove I²C 1 · J1':'Grove I²C 2 · J4';p.label=`${id==='vcc'?'3V3':id.toUpperCase()} · contact ${i+1}`;
 if(id==='vcc')p.rail='3.3';p.net=({sda:'d4',scl:'d5',vcc:'3v3',gnd:'gnd'})[id];
}
for(const p of PORTS.expansion){if(['uart-vcc','analog-vcc'].includes(p.id)){p.rail='3.3';p.label='3V3';}if(p.id==='analog-spare')p.label='NC · not connected';}
for(const [id,contact]of Object.entries({'a0':'J5:1','analog-spare':'J5:2','analog-vcc':'J5:3','analog-gnd':'J5:4','uart-rx':'J6:1','uart-tx':'J6:2','uart-vcc':'J6:3','uart-gnd':'J6:4'}))PORTS.expansion.find(p=>p.id===id).anchor=carrierContacts[contact].anchor;
PORTS.thermal.forEach((p,i)=>p.anchor=[.3+(i-1.5)*.18,-.4,.7]);
for(const id of ['oled-938','oled-326','oled-az','oled-uctronics']){
 PORTS[id]=i2c('',id==='oled-938'||id==='oled-326'?'STEMMA QT · JST-SH 4-pin':'4-pin header · verify order');
 PORTS[id].forEach((p,i)=>{p.anchor=[-.95,-.3,(i-1.5)*.08];if(p.id==='vcc'){p.rail='3.3';p.label='VIN · 3.3 V';}});
}
for(let n=1;n<=4;n++){
 PORTS['mosfet-'+n]=[
  port('sig','SIG · white','gpio','STEMMA · JST-PH 3-pin',[-.8,.1,-.2],'3.3'),
  port('vcc','V+ · red · 3 V motor rail','power','STEMMA · JST-PH 3-pin',[-.8,.1,0],'3.0'),
  port('gnd','GND · black','ground','STEMMA · JST-PH 3-pin',[-.8,.1,.2],'0'),
  port('out+','Motor + screw','motor','Screw terminal',[.8,.3,-.3]),port('out-','Motor − screw','motor','Screw terminal',[.8,.3,.3])];
 if(n>1)PORTS['motor-'+n]=PORTS.motor;
}
PORTS['motor-rail']=[port('vcc','3 V regulated output · pending','power','Unselected supply',[1,.3,-.3],'3.0'),port('gnd','Common ground','ground','Unselected distribution',[1,.3,.3],'0'),port('input','Supply input · NOT wired','power','Unselected supply',[-1,0,0],'unknown')];
// Keep every physical socket's contacts distinct: mux downstream data nets are
// isolated branches, while VCC/GND are common and are not switched by the hub.
const grovePorts=(prefix,group,anchor)=>['scl','sda','vcc','gnd'].map((id,i)=>port(prefix+id,`${id==='vcc'?'3V3':id.toUpperCase()} · contact ${i+1}`,id==='vcc'?'power':id==='gnd'?'ground':id,group,[anchor[0]+(i-1.5)*.045,anchor[1],anchor[2]],id==='vcc'?'3.3':id==='gnd'?'0':null));
for(const id of PLUG_MOTOR_IDS)PORTS[id]=grovePorts('','Grove · 0x5A',[-.6,.2,0]);
PORTS['haptic-hub']=[...grovePorts('up-','Upstream · 0x70',[-.82,.2,0]),...Array.from({length:8},(_,n)=>grovePorts('ch'+n+'-',`Channel ${n} · isolated I²C`,[-.5+(n%4)*.43,.2,n<4?-.65:.65])).flat()];
for(const id of ['lcd-27579','lcd-18366']){
 const labels=id==='lcd-27579'?['VCC','GND','MISO · unavailable','MOSI','SCLK','LCD_CS','LCD_DC','LCD_RST','LCD_BL','TP_SDA · not mapped','TP_SCL · not mapped','TP_INT · not mapped','TP_RST · not mapped']:['VCC','GND','DIN','CLK','CS','DC','RST','BL'];
 const pins=id==='lcd-27579'?['vcc','gnd','miso','mosi','sclk','cs','dc','rst','bl','tp-sda','tp-scl','tp-int','tp-rst']:['vcc','gnd','mosi','sclk','cs','dc','rst','bl'];
 PORTS[id]=pins.map((pin,n)=>port(pin,labels[n],pin==='vcc'?'power':pin==='gnd'?'ground':pin==='miso'?'unknown':pin==='tp-sda'?'sda':pin==='tp-scl'?'scl':'gpio',id==='lcd-27579'?'13-pin display connector · verify orientation':'PH2.0 8-pin display connector',[(n-(pins.length-1)/2)*.06,-.55,.85],pin==='vcc'?'3.3':pin==='gnd'?'0':null));
}
// Manufacturer GH housing spans X -9.2..10.3, rear Y -5..-1, Z 23.57..29.41 mm.
// Pin 1 at +X follows the rear pinout photo; each contact is spaced 1.25 mm.
PORTS['lcd-27579'].forEach((p,n)=>p.anchor=[(.55+(6-n)*1.25)/25.27,-.6,29.4/36.53]);
export function harnesses(state){
 const groups=new Map();
 for(const c of activeConnections(state)){
  // A control loom may fan out to both the GPIO header and a power distributor.
  const key=c.bundle||c.id;if(!groups.has(key))groups.set(key,{id:c.id,name:key,type:c.type,connections:[]});groups.get(key).connections.push(c);
 }
 return [...groups.values()];
}
export function harnessFor(state,id){return harnesses(state).find(h=>h.connections.some(c=>c.id===id));}
export function cableDescription(h){
 if(h.name==='Haptic hub uplink')return 'Carrier spare Grove I²C socket → standard four-wire Grove cable → TCA9548A hub upstream socket. Power and ground are shared by all branches; supply capacity still needs review.';
 if(/^Haptic [1-4]/.test(h.name))return 'TCA9548A channel socket → standard four-wire Grove cable → complete Grove Haptic Motor module. The driver and motor are already assembled. Select this channel alone to address its 0x5A motor independently.';
 if(h.connections.some(c=>[c.from,c.to].some(ref=>ref.startsWith('lcd-27579:'))))return 'LCD rear GH1.25 13-pin socket → included white plug and cable → eight individual female lead ends → eight 2.54 mm male-to-male jumper wires → spare female sockets alongside the XIAO. These plug down into the outer rows. Touch and MISO remain unconnected.';
 if(/LCD display cable/.test(h.name))return 'Carrier exposed headers → eight display conductors in the Waveshare cable → LCD connector. Click a row for the exact pin assignment. Match connector labels and jumper gender. This map powers and controls the display only; optional touch is not connected.';
 if(h.connections.some(c=>c.to==='strip:rf'||c.from==='strip:rf'))return 'ESP32 U.FL snap connector → coax → flexible antenna. Strip product, cable length and connector variant are not selected.';
 if(h.connections.some(c=>/coax/i.test(c.type)))return 'ESP32 U.FL snap connector → 150 mm coax pigtail → RP-SMA bulkhead → antenna threaded base. The large antenna does not attach directly to the tiny U.FL socket. Verify mating centre contacts.';
 if(h.name==='Thermal harness')return 'Carrier Grove I²C socket → four-wire adapter → thermal module 4-pin socket. SDA, SCL, power and ground are separate conductors. Connection reported by you; seller-side contact order and supply still need a bench check.';
 if(h.name==='Display cable')return 'Carrier spare Grove I²C socket → Adafruit 4528 cable → display STEMMA QT socket. Four conductors; installed QT revision required. The two carrier I²C sockets are the same bus.';
 if(/Motor .*control/.test(h.name))return 'STEMMA JST-PH 3-pin plug at the driver fans out into white SIG at the carrier, red V+ at the separate 3 V supply and black GND at common ground. Select male or female header ends to match your carrier; power distribution is not yet sourced.';
 if(/Motor .*leads/.test(h.name))return 'Two existing motor leads → the driver’s installed screw terminals. Clamp and strain-relieve each lead; no solder joint is needed.';
 return 'Select a conductor below to edit either endpoint, cable length, status or continuity notes.';
}
export const INTERNALS={
 expansion:[
  {name:'XIAO socket',route:'14-pin socket seats the XIAO. D4/D5 join the shared I²C bus.',evidence:'Project + Seeed'},
  {name:'128 × 64 OLED',route:'SDA ← D4 / GPIO5; SCL ← D5 / GPIO6. Power is onboard.',evidence:'Seeed expansion board reference'},
  {name:'User button',route:'Button signal → D1 / GPIO2; active-low input with pull-up in firmware.',evidence:'Seeed expansion board reference'},
  {name:'Passive buzzer',route:'Drive ← A3 / D3 / GPIO4. Existing firmware uses tone().',evidence:'Seeed expansion board reference'},
  {name:'2 × Grove I²C',route:'Both sockets share SDA D4 and SCL D5. Eagle v1.0 maps contact 1 SCL, 2 SDA, 3 SYS_3V3, 4 GND; confirm bench revision.',evidence:'Project + Seeed'},
  {name:'RTC + coin cell',route:'PCF8563 clock uses the I²C bus. Coin cell is RTC backup, not the main device supply.',evidence:'Seeed expansion example'},
  {name:'microSD',route:'D2 is SD chip select; D8 SCK, D9 MISO and D10 MOSI. Disable microSD and remove the card before using D2 for a motor channel.',evidence:'Seeed Eagle v1.0 200824'},
  {name:'Charger + battery socket',route:'1S LiPo socket and onboard charge circuit. Verify polarity and power path before adding a separate charger.',evidence:'Seeed · board revision pending'},
 ],
 xiao:[{name:'ESP32-S3',route:'2.4 GHz Wi-Fi + BLE; 3.3 V logic. D4 / GPIO5 SDA; D5 / GPIO6 SCL.',evidence:'Seeed pin map'}, {name:'USB-C + onboard charger',route:'USB data/power and 1S battery pads. Do not assume a second charger can be connected in parallel.',evidence:'Seeed battery guidance'}, {name:'U.FL radio connector',route:'RF feed for one matched 2.4 GHz antenna.',evidence:'Seeed U.FL-R-SMT1 / LNA_IN'}],
 thermal:[{name:'MLX90640 array',route:'32 × 24 pixels; I²C address 0x33. Bare IC needs 3.3 V.',evidence:'Melexis'}, {name:'Seller breakout + 4-pin cable',route:'VCC, GND, SCL, SDA labels visible in the screenshot. Physical pin order, regulator and pull-ups need verification.',evidence:'User screenshot'}],
 battery:[{name:'1S pouch + protection PCB',route:'3.7 V nominal, 4.2 V full. Positive and negative reach the JST through the pack protection board.',evidence:'Screenshot listing; circuit unverified'}],
 rf:[{name:'AD8317 + shield',route:'RF IN → logarithmic detector → analog VOUT. VSET configures measurement/control; exact board wiring unverified.',evidence:'Analog Devices + screenshot'}],
 motor:[{name:'ERM motor',route:'Two leads power the eccentric rotating mass. Requires a driver, not a GPIO supply.',evidence:'Screenshot 3 V motor'}],
 strip:[{name:'Flexible antenna + coax',route:'RF conductor and shield feed the antenna. Exact product and connector have not been chosen.',evidence:'Candidate'}],
 rod:[{name:'Antenna + adapter cable',route:'U.FL → coax → RP-SMA bulkhead → antenna. Confirm centre contact and gender at each mating interface.',evidence:'Screenshot listing'}],
 jst:[{name:'Two conductors',route:'Meter A1/A2 to B1/B2 and mark polarity. Straight-through mapping is not assumed.',evidence:'Continuity test required'}],
 headers:[{name:'40 independent pins',route:'Separate conductors on a 2.54 mm pitch. No two pins are connected unless soldered or wired.',evidence:'Screenshot listing'}],
 driver:[{name:'DRV2605L',route:'I²C controls OUT+/OUT− for ERM/LRA. Supply, breakout pinout and motor configuration need review.',evidence:'TI + candidate breakout'}],
 charger:[{name:'BQ24074 power path',route:'USB input → charger / managed system output; BAT connects to one protected 1S pack. Breakout not selected.',evidence:'TI + project plan'}],
};
INTERNALS['crowpanel-advance-28']=CROWPANEL_INTERNALS;
for(let n=1;n<=4;n++)INTERNALS['mosfet-'+n]=[{name:'MOSFET + flyback diode',route:'SIG controls the low-side MOSFET. V+ feeds motor positive; switched output returns motor negative to common ground. One board gives one independent motor channel.',evidence:'Adafruit PID5648'},{name:'Installed connectors',route:'JST-PH 3-pin STEMMA input and two output screws are preassembled. The 3 V power distribution is not yet selected.',evidence:'Adafruit product and CAD'}];
for(const id of ['oled-938','oled-326'])INTERNALS[id]=[{name:'SSD1306 + QT sockets',route:'SDA and SCL connect in parallel at both QT sockets. Default 0x3D; VIN takes the carrier 3.3 V supply. Use one external 0x3D display on this bus.',evidence:'Adafruit schematic / wiring guide'}];
for(const id of PLUG_MOTOR_IDS)INTERNALS[id]=[{name:'DRV2605L → attached motor',route:'Grove SDA/SCL control the onboard driver at 0x5A; its outputs already connect to the motor. No loose motor wiring is required. Grove VCC/GND feed the assembled module.',evidence:'Seeed Grove Haptic Motor v0.9 Eagle CAD and wiki'}];
INTERNALS['haptic-hub']=[{name:'TCA9548A channel switch',route:'Upstream SDA/SCL → selected CH0–CH7 data branch. Use one branch at a time for identical 0x5A motors. Power and ground stay common; switching channels does not remove motor power.',evidence:'Seeed 103020293 schematic and wiki'}];
for(const id of ['lcd-27579','lcd-18366'])INTERNALS[id]=[{name:'SPI display controller',route:'MOSI + SCLK transfer pixels; CS selects the display, DC selects command/data, RST resets it and BL controls backlight. 3.3 V supply and logic are paired in this plan. The 2.8-inch touch controller has separate, currently unmapped contacts.',evidence:'Waveshare manufacturer interface tables'}];
export const CABLE_TYPES=['HY2.0 4-pin harness · verify mating','Grove / 4-wire harness','JST-PH pigtail','U.FL coax / adapter','Hook-up wire','Header / jumper','Custom cable','Grove → STEMMA QT (4528)','STEMMA 3-pin → jumper (3893/3894)','Motor leads → screw terminals','Waveshare 13-pin display cable','PH2.0 8-pin display cable'];
export function portsFor(state,id){return PORTS[id]||state.custom?.find(p=>p.id===id)?.ports||[];}
export function endpoint(state,ref){const [id,pin]=ref.split(':');const p=portsFor(state,id).find(p=>p.id===pin);return p?{...p,part:id,ref}:null;}
export function endpointLabel(state,ref){const p=endpoint(state,ref);return p?`${p.group} · ${p.label}`:ref;}
export function seedConnections(preset='compact'){
 const antenna=preset==='bench'?'rod':'strip';
 return [
 ...['sda','scl','vcc','gnd'].map((pin,i)=>({id:'thermal-'+pin,from:'expansion:i2c1-'+pin,to:'thermal:'+pin,type:'Grove / 4-wire harness',bundle:'Thermal harness',length:100,color:['#47a6a0','#d5ae49','#ce7560','#65716e'][i],status:'Planned',note:'Functional map from project. Verify connector order, supply and pull-ups.'})),
 {id:'battery-positive',from:'battery:positive',to:'expansion:bat+',type:'JST-PH pigtail',bundle:'Battery cable',length:80,color:'#ce7560',status:'Planned',note:'Verify both connector polarities with a meter.'},
 {id:'battery-negative',from:'battery:negative',to:'expansion:bat-',type:'JST-PH pigtail',bundle:'Battery cable',length:80,color:'#65716e',status:'Planned',note:'Verify both connector polarities with a meter.'},
 {id:'antenna-rf',from:'xiao:rf',to:antenna+':rf',type:'U.FL coax / adapter',bundle:'Antenna coax',length:preset==='bench'?150:80,color:'#8d7cb4',status:'Planned',note:preset==='bench'?'15 cm pigtail per listing; RP-SMA mating to verify.':'Placeholder length; select exact strip and U.FL variant.'}
 ];
}
export function activeConnections(state){const ids=new Set(state.instances.map(i=>i.id));return (state.connections||[]).filter(c=>ids.has(c.from.split(':')[0])&&ids.has(c.to.split(':')[0]));}
export function connectionIssues(state,c){
 const a=endpoint(state,c.from),b=endpoint(state,c.to);const out=[];
 if(!a||!b)return ['Unknown endpoint.'];
 const ids=new Set(state.instances.map(i=>i.id));if(!ids.has(a.part)||!ids.has(b.part))out.push('One endpoint is outside the assembly.');
 if((a.signal==='ground'&&b.signal==='power')||(b.signal==='ground'&&a.signal==='power'))out.push('Power-to-ground short. Do not wire this.');
 if((a.signal==='motor')!==(b.signal==='motor'))out.push('Motor requires a driver output; this is not a valid motor drive pair.');
 if((a.signal==='rf')!==(b.signal==='rf'))out.push('RF coax must connect RF endpoints.');
 if((a.signal==='sda'&&b.signal==='scl')||(a.signal==='scl'&&b.signal==='sda'))out.push('I²C data and clock are crossed.');
 if(a.signal==='power'&&b.signal==='power'&&a.rail!==b.rail&&a.rail!=='unknown'&&b.rail!=='unknown')out.push('Power rails differ. A regulator or reviewed power path is required.');
 if((a.signal==='power'&&['gpio','sda','scl','tx','rx','analog'].includes(b.signal))||(b.signal==='power'&&['gpio','sda','scl','tx','rx','analog'].includes(a.signal)))out.push('Power connected to a signal pin. Check the circuit before wiring.');
 if(a.rail==='unknown'||b.rail==='unknown')out.push('Voltage range or breakout supply is unverified.');
 if(a.signal==='unknown'||b.signal==='unknown')out.push('Unassigned contact. Record continuity and signal purpose.');
 if(a.signal==='analog'||b.signal==='analog')out.push('Verify ADC range, protection, pin availability and calibration.');
 if(state.instances.some(i=>i.id==='expansion')&&[a,b].some(p=>['xiao','expansion'].includes(p.part)&&['d1','d3'].includes(p.net||p.id)))out.push('Pin already serves the onboard button or buzzer. Review that connection before reuse.');
 if(state.instances.some(i=>i.id==='expansion')&&[a,b].some(p=>['xiao','expansion'].includes(p.part)&&['d8','d9','d10'].includes(p.net||p.id)))out.push('SPI pins may be shared with the carrier microSD. Audit the carrier schematic.');
 if(state.instances.some(i=>i.id==='expansion')&&[a,b].some(p=>['xiao','expansion'].includes(p.part)&&(p.net||p.id)==='d2'))out.push('D2 is microSD chip-select. Disable microSD and remove its card before reassigning this pin.');
 if(state.instances.some(i=>i.id==='expansion')&&[a,b].some(p=>['xiao','expansion'].includes(p.part)&&['d6','d7'].includes(p.net||p.id)))out.push('D6/D7 also serve Grove UART. Keep UART unused when reassigning these pins.');
 const controllerNet=p=>['xiao','expansion'].includes(p?.part)?(p.net||p.id):null;
 const selectedNets=[a,b].map(controllerNet).filter(Boolean);
 for(const net of selectedNets.filter(n=>['d0','d2','d6','d7'].includes(n))){
  const others=(state.connections||[]).filter(other=>other.id!==c.id&&[other.from,other.to].some(ref=>controllerNet(endpoint(state,ref))===net));
  if(others.length)out.push(`${net.toUpperCase()} has multiple planned peripheral assignments. Use a separate pin for each control input.`);
 }
 if(selectedNets.includes('d0')&&(state.connections||[]).some(other=>other.id!==c.id&&[other.from,other.to].some(ref=>ref.startsWith('rf:'))&&[other.from,other.to].some(ref=>controllerNet(endpoint(state,ref))==='d0')))out.push('D0 is also assigned to the RF detector. Choose a different motor signal or ADC pin.');
 const conflicts=(state.connections||[]).filter(other=>other.id!==c.id&&[other.from,other.to].some(ref=>ref===c.from||ref===c.to));
 if([a,b].some(p=>p.signal==='power')&&conflicts.length)out.push('Power contact has multiple planned connections. Verify sources and the charging path.');
 if([a,b].some(p=>p.part.startsWith('mosfet-')&&p.id==='sig')&&conflicts.some(other=>[other.from,other.to].some(ref=>{const p=endpoint(state,ref);return p?.part.startsWith('mosfet-')&&p.id==='sig'&&[c.from,c.to].includes(ref);})))out.push('Driver signal has multiple planned sources. Use one independent GPIO per driver input.');
 if(a.signal==='rf'&&conflicts.length)out.push('RF feed has more than one cable; a reviewed switch/splitter would be needed.');
 if(a.part==='battery'||b.part==='battery')out.push('Meter polarity and verify the single charging path.');
 const ai=state.instances.find(i=>i.id===a.part),bi=state.instances.find(i=>i.id===b.part);
 if(ai&&bi){const dist=Math.hypot(...ai.position.map((v,i)=>v-bi.position[i]));if(c.length&&c.length<dist/2)out.push('Cable is short relative to the part centres; measure the routed path.');}
 if(c.status!=='Bench checked')out.push('Planned wiring; not physically verified.');
 return [...new Set(out)];
}
export function connectionCsv(state){const rows=[['From component','From pin','To component','To pin','Cable','Harness','Length mm','Status','Notes']];for(const c of state.connections||[]){const a=endpoint(state,c.from),b=endpoint(state,c.to);rows.push([a?.part||'',a?.label||c.from,b?.part||'',b?.label||c.to,c.type,c.bundle,c.length,c.status,c.note]);}return rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');}
