import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/catalog.js';
import { validateState, checks } from '../src/engine.js';
import { addScreen, addHaptics, addPlugHaptics, planningIssues } from '../src/planning.js';
import { HEADER_ROWS, PORTS, harnesses, connectionIssues, endpoint, connectionCsv } from '../src/connections.js';
test('seven physical contacts per side preserve D6 left, D7 right and carrier net order',()=>{
 assert.equal(HEADER_ROWS.length,7);assert.deepEqual(HEADER_ROWS[6],['d6','d7']);assert.deepEqual(HEADER_ROWS[0],['d0','5v']);
 for(const pair of HEADER_ROWS)for(const pin of pair){const x=PORTS.xiao.find(p=>p.id===pin),c=PORTS.expansion.find(p=>p.id==='h-'+pin);assert.equal(x.net,c.net);}
 assert(PORTS.xiao.find(p=>p.id==='d6').anchor[0]<0);assert(PORTS.xiao.find(p=>p.id==='d7').anchor[0]>0);
});
test('thermal harness has four separately anchored wires and antenna has its own bundle',()=>{const s=defaultState('bench'),h=harnesses(s);assert.equal(h.length,3);assert.equal(h[0].connections.length,4);assert.equal(new Set(PORTS.thermal.map(p=>JSON.stringify(p.anchor))).size,4);});
test('screen preview replaces the prior external display and maps a four-wire QT cable',()=>{
 const s=defaultState();addScreen(s,'oled-938');assert.equal(s.connections.filter(c=>c.bundle==='Display cable').length,4);assert.equal(s.instances.filter(i=>i.id==='expansion').length,1);
 addScreen(s,'oled-326');assert(!s.instances.some(i=>i.id==='oled-938'));assert(!s.connections.some(c=>c.to.startsWith('oled-938')));assert.equal(s.connections.length,11);
 addScreen(s,'oled-az');assert.equal(s.connections.length,7);assert(planningIssues(s).some(c=>c.title.includes('address pending')));
});
test('four independent channels use four drivers, never GPIO-to-motor, and leave supply input unconnected',()=>{
 const s=defaultState('bench');addHaptics(s);addHaptics(s);
 assert.equal(s.instances.filter(i=>i.id.startsWith('mosfet-')).length,4);assert.equal(s.instances.filter(i=>/^motor(?:-[234])?$/.test(i.id)).length,4);
 const controls=s.connections.filter(c=>c.id.endsWith('-sig'));assert.equal(controls.length,4);assert.equal(new Set(controls.map(c=>c.from)).size,4);
 assert.equal(s.connections.length,28);assert(!s.connections.some(c=>[c.from,c.to].includes('motor-rail:input')));
 for(const c of s.connections){assert(endpoint(s,c.from));assert(endpoint(s,c.to));assert(!connectionIssues(s,c).some(t=>t.includes('not a valid motor drive')));}
 assert(connectionIssues(s,controls[1]).some(t=>t.includes('microSD')));assert(checks(s).some(c=>c.title==='Motor power design is incomplete'));
 assert.deepEqual(validateState(s).connections,s.connections);assert(connectionCsv(s).includes('Motor + screw'));
});
test('two added QT screens are flagged for their shared 0x3D address',()=>{
 const s=defaultState();addScreen(s,'oled-938');s.instances.push({id:'oled-326',position:[0,0,0],rotation:[0,0,0],dimensions:[29.2,6.2,26.7]});assert(planningIssues(s).some(c=>c.title.includes('share 0x3D')));
});
test('a second GPIO source on one motor driver remains a visible wiring conflict',()=>{
 const s=defaultState();addHaptics(s);const c={...s.connections.find(c=>c.id==='mosfet-1-sig'),id:'second-signal',from:'xiao:d8'};
 assert(connectionIssues(s,c).some(t=>t.includes('multiple planned sources')));s.connections.push(c);assert(checks(s).some(c=>c.detail.includes('multiple planned sources')));
});
test('battery-sized SPI screens map eight valid display contacts and leave touch and MISO unwired',()=>{
 const s=defaultState();addScreen(s,'lcd-27579');
 const wires=s.connections.filter(c=>c.to.startsWith('lcd-27579:'));
 assert.equal(wires.length,8);assert.equal(PORTS['lcd-27579'].length,13);
 assert.deepEqual(Object.fromEntries(wires.map(c=>[c.to.split(':')[1],c.from])),{vcc:'expansion:h-3v3',gnd:'expansion:h-gnd',mosi:'expansion:h-d10',sclk:'expansion:h-d8',cs:'expansion:h-d0',dc:'expansion:h-d2',rst:'expansion:h-d6',bl:'expansion:h-d7'});
 assert(!wires.some(c=>/tp-|miso/.test(c.to)));
 addScreen(s,'lcd-18366');assert(!s.connections.some(c=>c.to.startsWith('lcd-27579:')));assert.equal(s.connections.length,15);
 for(const c of s.connections){assert(endpoint(s,c.from));assert(endpoint(s,c.to));}
 assert.deepEqual(validateState(s).connections,s.connections);
});
test('plug-in preset replaces loose motors and creates five complete Grove cables without GPIO control',()=>{
 const s=defaultState();addHaptics(s);addScreen(s,'lcd-27579');addPlugHaptics(s);addPlugHaptics(s);
 assert.equal(s.instances.filter(i=>i.id.startsWith('grove-haptic-')).length,4);
 assert(!s.instances.some(i=>/^(motor|mosfet)/.test(i.id)));assert(!s.connections.some(c=>/motor-rail|mosfet/.test(c.from+c.to)));
 assert.equal(s.connections.length,35);
 for(let n=0;n<4;n++){
  const h=harnesses(s).find(h=>h.name===`Haptic ${n+1} · channel ${n}`);assert.equal(h.connections.length,4);
  for(const pin of ['sda','scl','vcc','gnd'])assert(h.connections.some(c=>c.from===`haptic-hub:ch${n}-${pin}`&&c.to===`grove-haptic-${n+1}:${pin}`));
 }
 for(const c of s.connections){assert(endpoint(s,c.from));assert(endpoint(s,c.to));assert(!connectionIssues(s,c).some(t=>/multiple planned peripheral|Power rails differ|I²C data and clock are crossed/.test(t)));}
 assert(!planningIssues(s).some(i=>i.title==='Haptic channel mapping is incomplete or shared'));
 assert(planningIssues(s).some(i=>i.detail.includes('3 W')));assert.deepEqual(validateState(s).connections,s.connections);
});
test('older LCD depth is preserved on import and flagged against the manufacturer envelope',()=>{
 const s=defaultState();addScreen(s,'lcd-27579');
 const lcd=s.instances.find(i=>i.id==='lcd-27579');assert.equal(lcd.dimensions[1],10);
 const issue='LCD depth is below the manufacturer CAD envelope';
 assert(!planningIssues(s).some(i=>i.title===issue));
 lcd.dimensions[1]=8;
 const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.instances.find(i=>i.id==='lcd-27579').dimensions[1],8);
 assert(planningIssues(restored).some(i=>i.title===issue));
});
test('edited haptic routes flag shared branches, split SDA/SCL and a removed hub',()=>{
 const s=defaultState();addPlugHaptics(s);
 const hasIssue=()=>planningIssues(s).some(i=>i.title==='Haptic channel mapping is incomplete or shared');
 s.connections.find(c=>c.to==='grove-haptic-2:sda').from='haptic-hub:ch0-sda';assert(hasIssue());
 s.connections.find(c=>c.to==='grove-haptic-2:scl').from='haptic-hub:ch0-scl';assert(hasIssue());
 s.instances=s.instances.filter(i=>i.id!=='haptic-hub');assert(hasIssue());
});
test('SPI screen plus legacy GPIO motors surfaces pin conflicts; plug-in replacement resolves them',()=>{
 const s=defaultState();addHaptics(s);addScreen(s,'lcd-27579');
 const c=s.connections.find(c=>c.to==='lcd-27579:cs');assert(connectionIssues(s,c).some(t=>t.includes('multiple planned peripheral')));
 addPlugHaptics(s);assert(!connectionIssues(s,c).some(t=>t.includes('multiple planned peripheral')));
});
