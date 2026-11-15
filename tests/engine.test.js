import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, PARTS } from '../src/catalog.js';
import { checks, bounds, moveInstance, mounted, validateState, envelope, runtime, reviewBrief } from '../src/engine.js';
const add=(s,id,position=[0,32,0],rotation=[0,0,0])=>s.instances.push({id,position,rotation,dimensions:[...PARTS[id].dimensions]});
test('compact preset has five distinct parts, seated controller and no geometry collision',()=>{
 const s=defaultState();assert.equal(s.instances.length,5);assert(mounted(s.instances.find(i=>i.id==='expansion'),s.instances.find(i=>i.id==='xiao')));assert.equal(checks(s).filter(c=>c.title.includes('overlaps')||c.title.includes('extends outside')).length,0);assert(checks(s).some(c=>c.title.includes('polarity')));
});
test('bench antenna is outside the compact interior; it does not certify enclosure fit',()=>assert(checks(defaultState('bench')).some(c=>c.title==='Bench antenna extends outside')));
test('rotations affect bounds and overlapping rotated proxies are detected',()=>{
 const s=defaultState();s.instances=[{id:'battery',position:[0,10,0],rotation:[0,90,0],dimensions:[55,5,73]}];const b=bounds(s.instances[0]);assert(Math.abs(b.max.x-b.min.x-73)<1e-6);add(s,'motor',[0,10,0]);assert(checks(s).some(c=>c.title.includes('overlaps')));
});
test('separated parts and touching faces are not collisions',()=>{
 const s=defaultState();s.instances=[{id:'battery',position:[0,2.5,0],rotation:[0,0,0],dimensions:[55,5,73]},{id:'motor',position:[0,6.5,0],rotation:[0,0,0],dimensions:[10,3,10]}];assert(!checks(s).some(c=>c.title.includes('overlaps')));
});
test('carrier motion rotates and translates the mounted XIAO as one assembly',()=>{
 const s=defaultState();moveInstance(s,'expansion',[12,25,15],[0,90,0]);assert(mounted(s.instances.find(i=>i.id==='expansion'),s.instances.find(i=>i.id==='xiao')));const x=s.instances.find(i=>i.id==='xiao');assert(Math.abs(x.position[0]+5)<.001);const before=[...x.position];moveInstance(s,'xiao',[0,0,0],[0,0,0]);assert.deepEqual(x.position,before);
});
test('unlocked XIAO displacement is flagged',()=>{const s=defaultState();s.lockCore=false;moveInstance(s,'xiao',[0,80,0],[0,0,0]);assert(checks(s).some(c=>c.title==='XIAO is off its mount'));});
test('motor check changes with a driver, but remains an integration review',()=>{const s=defaultState();add(s,'motor');assert(checks(s).some(c=>c.title==='Coin motor needs a driver'));add(s,'driver',[40,32,0]);assert(!checks(s).some(c=>c.title==='Coin motor needs a driver'));assert(checks(s).some(c=>c.title==='Haptic firmware & current check'));});
test('two antennas flag one RF connector and RF detector flags missing integration',()=>{const s=defaultState();add(s,'rod');add(s,'rf');assert(checks(s).some(c=>c.title==='Two antennas, one RF connector'));assert(checks(s).some(c=>c.title==='RF detector integration incomplete'));});
test('runtime is explicitly assumption based and disappears without battery',()=>{const s=defaultState();assert.equal(runtime(s),2000/158);s.assumptions.current=200;assert.equal(runtime(s),10);s.instances=s.instances.filter(i=>i.id!=='battery');assert.equal(runtime(s),0);});
test('JSON roundtrip keeps dimensions, placements, decisions and notes',()=>{const s=defaultState();s.notes.push({part:'thermal',text:'Measure lens height',at:new Date().toISOString()});s.decisions.strip='Hold';const restored=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.instances,s.instances);assert.deepEqual(restored.notes,s.notes);assert.equal(restored.decisions.strip,'Hold');assert(reviewBrief(restored).includes('Measure lens height'));});
test('import rejects invalid geometry, unknown parts, duplicates and prototype keys',()=>{
 for(const change of [s=>s.instances[0].dimensions[0]=-1,s=>s.instances[0].position[1]=Infinity,s=>s.instances[0].id='unknown',s=>s.instances.push(s.instances[0]),s=>s.enclosure=[0,5,5],s=>s.instances[0].id='kit']){const s=defaultState();change(s);assert.throws(()=>validateState(s));}
 const s=defaultState();s.decisions={'__proto__':'Approve'};const cleaned=validateState(s);assert.deepEqual(cleaned.decisions,{});
});
test('empty assembly has a zero envelope and no runtime',()=>{const s=defaultState();s.instances=[];assert.deepEqual(envelope(s),[0,0,0]);assert.equal(runtime(s),0);});

test('cable plans round-trip and reject unknown contacts, duplicate IDs and invalid lengths',()=>{
 const s=defaultState();const round=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(round.connections,s.connections);
 for(const change of [s=>s.connections[0].to='thermal:missing',s=>s.connections[0].length=-1,s=>s.connections.push(s.connections[0]),s=>s.connections[0].color='red<script>']){const v=defaultState();change(v);assert.throws(()=>validateState(v));}
});
