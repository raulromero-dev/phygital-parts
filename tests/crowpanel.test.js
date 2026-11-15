import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, PARTS } from '../src/catalog.js';
import { addCrowPanel, addScreen, addPlugHaptics } from '../src/planning.js';
import { validateState } from '../src/engine.js';
import { PORTS, connectionIssues, endpoint } from '../src/connections.js';

test('CrowPanel comparison preserves the current screen, haptics, placement and cable plan', () => {
  const state=defaultState(); addScreen(state,'lcd-27579'); addPlugHaptics(state);
  const before=structuredClone(state);
  addCrowPanel(state); addCrowPanel(state);
  assert.deepEqual(state.instances.filter(p=>p.id!=='crowpanel-advance-28'),before.instances);
  assert.deepEqual(state.connections,before.connections);
  assert.equal(state.instances.filter(p=>p.id==='crowpanel-advance-28').length,1);
  assert.deepEqual(validateState(state).instances,state.instances);
  assert.equal(PARTS['crowpanel-advance-28'].owned,false);
});

test('CrowPanel contacts distinguish 3.3V sensor power, 5V input, cell and PCB antenna', () => {
  const state=defaultState(); addCrowPanel(state);
  const ref=id=>'crowpanel-advance-28:'+id;
  assert.equal(endpoint(state,ref('j7-1')).signal,'scl');
  assert.equal(endpoint(state,ref('j7-2')).signal,'sda');
  assert.equal(endpoint(state,ref('j7-3')).rail,'3.3');
  assert.equal(endpoint(state,ref('j5-3')).rail,'5');
  assert.equal(endpoint(state,ref('j10-1')).rail,'cell');
  assert(!PORTS['crowpanel-advance-28'].some(p=>p.signal==='rf'));
  const cross={id:'wrong-power',from:ref('j5-3'),to:'expansion:3v3',length:100};
  assert(connectionIssues(state,cross).some(s=>s.includes('Power rails differ')));
  const wire={id:'camera-sda',from:ref('j7-2'),to:'thermal:sda',length:150,type:'HY2.0 4-pin harness · verify mating',bundle:'CrowPanel thermal study',color:'#777777',status:'Planned',note:'Confirm thermal connector order'};
  state.connections.push(wire);
  assert.deepEqual(validateState(state).connections.at(-1),wire);
});

test('CrowPanel visual contacts use full half-envelope units, including board-edge USB ports', () => {
  const ports=PORTS['crowpanel-advance-28'];
  assert.equal(new Set(ports.map(p=>p.id)).size,16);
  // Regression: dividing by full dimensions puts every socket halfway to the board centre.
  assert(ports.find(p=>p.id==='j3').anchor[0]>.98);
  assert(ports.find(p=>p.id==='j7-1').anchor[1]<-.95);
  for(const p of ports)assert(p.anchor.every(n=>Number.isFinite(n)&&Math.abs(n)<=1.02));
});
