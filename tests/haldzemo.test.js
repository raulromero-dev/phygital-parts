import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Quaternion } from 'three';
import { defaultState } from '../src/catalog.js';
import { validateState } from '../src/engine.js';
import { endpoint, connectionIssues } from '../src/connections.js';
import { HALDZEMO_ID, HALDZEMO_PORTS, JUMPER_MF } from '../src/haldzemo.js';
import { appendHaldzemoComparison } from '../src/haldzemo-assembly.js';
import { planningIssues } from '../src/planning.js';
import { jumperCurve, jumperConnector, JUMPER_EXIT } from '../src/jumper-geometry.js';

test('additive comparison preserves the original assembly and maps 11 physical jumpers',()=>{
 const original=defaultState(),snapshot=structuredClone(original);
 const s=appendHaldzemoComparison(original,{at:'2026-11-16T23:00:00.000Z'});
 assert.deepEqual(original,snapshot);assert.deepEqual(s.instances.slice(0,original.instances.length),original.instances);
 assert.deepEqual(s.connections.slice(0,original.connections.length),original.connections);
 const wires=s.connections.filter(c=>c.type===JUMPER_MF);
 assert.equal(wires.length,11);assert.equal(HALDZEMO_PORTS.length,14);
 assert.equal(new Set(wires.map(c=>c.to)).size,11);
 assert(!wires.some(c=>/:(led|miso|sd-cs)$/.test(c.from)));
 assert(wires.every(c=>c.to.startsWith('custom-haldzemo-carrier:')));
 assert(wires.some(c=>c.from.endsWith(':tp-int')&&c.to.endsWith(':h-d9')));
 assert(wires.some(c=>c.from.endsWith(':tp-sda')&&c.to.endsWith(':h-d4')));
 for(const c of s.connections){assert(endpoint(s,c.from));assert(endpoint(s,c.to));assert(!connectionIssues(s,c).some(t=>/short|crossed|rails differ|signal pin|not a valid motor/.test(t)));}
 const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.connections,s.connections);
 assert(connectionIssues(restored,wires.find(c=>c.to.endsWith(':h-d2'))).some(t=>t.includes('Disable microSD')));assert.equal(restored.instances.length,original.instances.length+10);
 assert.equal(restored.custom.find(p=>p.id==='custom-haldzemo-carrier').modelId,'expansion');
 assert(!planningIssues(restored).some(p=>p.title==='Haptic channel mapping is incomplete or shared'));
 assert(planningIssues(restored).some(p=>p.detail.includes('3 W')));
 assert.throws(()=>appendHaldzemoComparison(s),/already present/);
});
test('rear header preserves pin pitch and the modeled connector base',()=>{
 const mm=HALDZEMO_PORTS.map(p=>p.anchor.map((v,i)=>v*[25,7.14,43][i]));
 assert.equal(HALDZEMO_PORTS[0].id,'vcc');assert.equal(HALDZEMO_PORTS[13].id,'sd-cs');
 mm.slice(1).forEach((p,n)=>assert(Math.abs(p[0]-mm[n][0]-2.54)<1e-9));
 mm.forEach(p=>{assert.equal(p[1],-1.5);assert.equal(p[2],40.6);});
});
test('jumper housings follow rotated boards and cables leave their wire exits',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),Math.PI/2);
 const f=new Vector3(0,44,40),m=new Vector3(10,16,-20),fn=new Vector3(0,-1,0).applyQuaternion(q),mn=new Vector3(0,1,0);
 const curve=jumperCurve(f,m,fn,mn);
 assert(curve.getPoint(0).distanceTo(f.clone().addScaledVector(fn,JUMPER_EXIT))<1e-8);
 assert(curve.getPoint(1).distanceTo(m.clone().addScaledVector(mn,JUMPER_EXIT))<1e-8);
 for(const [pos,norm,gender] of [[f,fn,'female'],[m,mn,'male']]){
  const group=jumperConnector(pos,norm,gender,'wire');
  assert(new Vector3(0,1,0).applyQuaternion(group.quaternion).distanceTo(norm)<1e-8);
  assert(group.children.every(o=>o.userData.connectionId==='wire'));
 }
});
