import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Quaternion, Matrix4 } from 'three';
import { defaultState } from '../src/catalog.js';
import { validateState, fitBoxes } from '../src/engine.js';
import { endpoint, connectionIssues } from '../src/connections.js';
import { HALDZEMO, HALDZEMO_ID, HALDZEMO_PORTS, JUMPER_MF } from '../src/haldzemo.js';
import { appendHaldzemoComparison } from '../src/haldzemo-assembly.js';
import { planningIssues } from '../src/planning.js';
import { jumperCurve, haldzemoJumperCurve, jumperConnector, JUMPER_EXIT } from '../src/jumper-geometry.js';

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

test('stacked LCD jumpers turn around the rear edge and return above the carrier',()=>{
 const matrix=new Matrix4().makeTranslation(0,42.5,0);
 const f=new Vector3(-16.51,41,40.6),m=new Vector3(-22.3,25.25,-18);
 const normal=new Vector3(0,1,0),curve=haldzemoJumperCurve(f,m,matrix,normal);
 const points=curve.getPoints(400);
 assert(points.some(p=>p.z>48));
 assert(points.filter(p=>p.z<37).every(p=>p.y>35));
 assert(points.every(p=>p.y<40.75));
 assert(curve.getPoint(0).distanceTo(f.clone().add(new Vector3(0,-JUMPER_EXIT,0)))<1e-8);
 assert(curve.getPoint(1).distanceTo(m.clone().addScaledVector(normal,JUMPER_EXIT))<1e-8);
 const rotation=new Matrix4().makeRotationZ(Math.PI/3);
 const rotated=haldzemoJumperCurve(f.clone().applyMatrix4(rotation),m.clone().applyMatrix4(rotation),rotation.clone().multiply(matrix),normal.clone().transformDirection(rotation));
 points.forEach((p,n)=>assert(rotated.getPoint(n/400).distanceTo(p.clone().applyMatrix4(rotation))<1e-7));
});

test('LCD fit regions preserve the projecting header without filling its empty underside',()=>{
 const i={id:HALDZEMO_ID,position:[0,0,0],rotation:[0,0,0],dimensions:[...HALDZEMO.dimensions]};
 const boxes=fitBoxes(i,HALDZEMO),has=p=>boxes.some(b=>b.containsPoint(new Vector3(...p)));
 assert(!has([0,-4,0]));assert(has([0,-4,40.6]));assert(has([0,0,0]));assert(has([0,7,0]));
 const rotated=fitBoxes({...i,position:[5,8,3],rotation:[0,0,90]},HALDZEMO);
 assert(rotated.some(b=>b.containsPoint(new Vector3(9,8,43.6))));
 const duplicate={...HALDZEMO,id:'custom-screen',modelId:HALDZEMO_ID};
 assert.equal(fitBoxes({...i,id:duplicate.id},duplicate).length,2);
 assert.deepEqual(i.dimensions,[50,14.28,86]);
});

test('close stack routes through the carrier edge corridor with cable allowance',()=>{
 const screen=new Matrix4().makeTranslation(0,30.5,0),carrier=new Matrix4().makeTranslation(-5.25,11,6);
 const f=new Vector3(11.43,29,40.6),m=new Vector3(5.176,13.25,-17.54);
 const curve=haldzemoJumperCurve(f,m,screen,new Vector3(0,1,0),carrier);
 const screenBoxes=fitBoxes({position:[0,30.5,0],rotation:[0,0,0],dimensions:HALDZEMO.dimensions},HALDZEMO);
 for(const p of curve.getPoints(400))assert(!screenBoxes.some(b=>b.containsPoint(p)));
 assert(curve.getLength()+2*JUMPER_EXIT<100);
 assert(curve.getPoint(0).distanceTo(f.clone().add(new Vector3(0,-JUMPER_EXIT,0)))<1e-8);
 assert(curve.getPoint(1).distanceTo(m.clone().add(new Vector3(0,JUMPER_EXIT,0)))<1e-8);
});
