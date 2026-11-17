import { bounds, mounted, partFor } from './engine.js';

export const DEFAULT_EXPLODE = .2;
export const initialExplode = search => new URLSearchParams(search).get('view') === 'compact' ? 0 : DEFAULT_EXPLODE;
export const clampExplode = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

// A viewing offset only: zero is exactly the saved assembly, including its
// physical clearances. Inventory order must never determine the layer stack.
export function explodedOffsets(state, value) {
  const amount = clampExplode(value);
  const offsets = new Map(state.instances.map(i => [i.id, 0]));
  if (!amount) return offsets;
  const family = i => { const p = partFor(state, i.id); return p?.modelId || p?.id; };
  const carriers = state.instances.filter(i => family(i) === 'expansion');
  const attached = new Map();
  for (const i of state.instances) {
    if (family(i) !== 'xiao') continue;
    const carrier = carriers.find(c => mounted(c, i));
    if (carrier) attached.set(i.id, carrier.id);
  }
  const layers = state.instances.filter(i => !attached.has(i.id))
    .map(i => ({ id: i.id, base: bounds(i).min.y }))
    .sort((a, b) => a.base - b.base || a.id.localeCompare(b.id));
  let layer = -1, base = -Infinity;
  for (const i of layers) {
    if (i.base - base > .5) { layer++; base = i.base; }
    offsets.set(i.id, layer * 20 * amount);
  }
  for (const [child, parent] of attached) offsets.set(child, offsets.get(parent));
  return offsets;
}
