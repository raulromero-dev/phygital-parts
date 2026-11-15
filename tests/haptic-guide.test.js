import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/catalog.js';
import { addPlugHaptics } from '../src/planning.js';
import { endpoint } from '../src/connections.js';
import { HAPTIC_ROUTES, HAPTIC_SIGNALS } from '../src/haptic-data.js';

test('the illustrated five cables agree with the editable assembly and valid contacts',()=>{
 const state=defaultState();addPlugHaptics(state);
 assert.equal(HAPTIC_ROUTES.length,5);
 const shown=HAPTIC_ROUTES.flatMap(route=>HAPTIC_SIGNALS.map(signal=>({from:route.from+signal.id,to:route.to+signal.id})));
 const actual=state.connections.filter(c=>/^(haptic-hub|grove-haptic-)/.test(c.to));
 assert.equal(shown.length,20);assert.equal(actual.length,20);
 for(const wire of shown){
  assert(actual.some(c=>c.from===wire.from&&c.to===wire.to),`${wire.from} → ${wire.to} differs from the assembly preset`);
  const from=endpoint(state,wire.from),to=endpoint(state,wire.to);
  assert(from&&to);assert.equal(from.signal,to.signal);
 }
 // Thermal remains on J1; the guide cannot silently move it to the haptic hub.
 assert(state.connections.some(c=>c.from==='expansion:i2c1-sda'&&c.to.startsWith('thermal:')));
});
