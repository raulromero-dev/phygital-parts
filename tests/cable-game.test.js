import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME, newFlight, jump, togglePause, advanceFlight, gateX, targetX } from '../src/cable-game-physics.js';
test('flight starts only on input; gravity, pause and resume preserve state',()=>{
 const s=newFlight(()=>.5);advanceFlight(s,1);assert.equal(s.distance,0);jump(s);assert.equal(s.phase,'playing');advanceFlight(s,.05);assert.ok(s.y>0);assert.ok(s.velocity<GAME.jump);togglePause(s);const before=structuredClone(s);advanceFlight(s,10);assert.deepEqual(s,before);togglePause(s);advanceFlight(s,.05);assert.ok(s.distance>before.distance);
});
test('connector collision and field edges end the flight, with no further scoring',()=>{
 const s=newFlight(()=>.5);jump(s);s.distance=6-GAME.playerX;s.y=3;advanceFlight(s,.01);assert.equal(s.phase,'lost');assert.equal(s.reason,'contact');const d=s.distance;advanceFlight(s,1);assert.equal(s.distance,d);
 const edge=newFlight();jump(edge);edge.y=4.9;advanceFlight(edge,.01);assert.equal(edge.reason,'edge');
});
test('passing a gate scores once and a dock requires vertical alignment',()=>{
 const s=newFlight(()=>.5);jump(s);s.distance=6-GAME.playerX+1;s.y=0;advanceFlight(s,.01);assert.equal(s.score,1);advanceFlight(s,.01);assert.equal(s.score,1);
 s.distance=6+(GAME.total-1)*GAME.spacing+5-(GAME.playerX+1.3);s.y=0;advanceFlight(s,.01);assert.equal(s.phase,'won');
 const miss=newFlight(()=>.5);jump(miss);miss.distance=s.distance+2;miss.y=2;advanceFlight(miss,.01);assert.equal(miss.phase,'lost');assert.equal(miss.reason,'dock');
});
test('a full six-gate course is winnable using only jump inputs',()=>{
 const values=[.1,.9,.25,.75,.5];let i=0;const s=newFlight(()=>values[i++%values.length]);jump(s);
 for(let frame=0;frame<5000&&s.phase==='playing';frame++){
  const next=s.gateCenters.findIndex((_,i)=>gateX(s,i)>GAME.playerX-.9);const aim=next<0?0:s.gateCenters[next];
  if(s.y<aim-.35&&s.velocity<0)jump(s);advanceFlight(s,1/120);
 }
 assert.equal(s.phase,'won');assert.equal(s.score,6);assert.ok(targetX(s)<0);
});
test('long frame gaps are capped and collisions are substepped',()=>{
 const a=newFlight(()=>.5),b=newFlight(()=>.5);jump(a);jump(b);advanceFlight(a,3);advanceFlight(b,.1);assert.deepEqual(a,b);
});
