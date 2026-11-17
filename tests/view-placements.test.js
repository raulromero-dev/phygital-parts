import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/catalog.js';
import { moveInstance } from '../src/engine.js';
import { appendHaldzemoComparison } from '../src/haldzemo-assembly.js';
import { DEFAULT_EXPLODE, initialExplode, explodedOffsets } from '../src/view-placements.js';

test('compact viewing links override the separated default without changing project data', () => {
  assert.equal(initialExplode(''), DEFAULT_EXPLODE);
  assert.equal(initialExplode('?layout=compact'), DEFAULT_EXPLODE);
  assert.equal(initialExplode('?view=compact'), 0);
  assert.equal(initialExplode('?view=unknown'), DEFAULT_EXPLODE);
});

test('zero removes all viewing offsets without changing the document', () => {
  const state = defaultState(), before = structuredClone(state);
  assert(DEFAULT_EXPLODE > 0);
  const separated = explodedOffsets(state, DEFAULT_EXPLODE);
  assert([...separated.values()].some(v => v > 0));
  const compact = explodedOffsets(state, 0);
  for (const i of state.instances) assert.equal(compact.get(i.id), 0);
  assert.deepEqual(state, before);
});

test('layers are independent of inventory order and keep seated boards together', () => {
  const state = appendHaldzemoComparison(defaultState());
  moveInstance(state, 'expansion', [7, 18, 5], [0, 90, 0]);
  const offsets = explodedOffsets(state, 1);
  assert.equal(offsets.get('xiao'), offsets.get('expansion'));
  assert.equal(offsets.get('custom-haldzemo-xiao'), offsets.get('custom-haldzemo-carrier'));
  assert.deepEqual(explodedOffsets({ ...state, instances: [...state.instances].reverse() }, 1), offsets);
  const low = { ...state.instances[0], id: 'low', position: [0, 2, 0], dimensions: [4, 4, 4], rotation: [0, 0, 0] };
  const high = { ...low, id: 'high', position: [0, 12, 0] };
  const same = { ...high, id: 'same', position: [30, 12, 0] };
  const stack = { ...state, instances: [high, low, same] };
  const a = explodedOffsets(stack, .5);
  assert.equal(a.get('low'), 0); assert.equal(a.get('high'), 10); assert.equal(a.get('same'), 10);
  for (const value of [-1, NaN, Infinity]) assert([...explodedOffsets(stack, value).values()].every(v => v === 0));
  assert.deepEqual(explodedOffsets(stack, 99), explodedOffsets(stack, 1));
});
