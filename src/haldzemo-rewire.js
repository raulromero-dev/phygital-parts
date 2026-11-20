import { HALDZEMO_ID, HALDZEMO, HALDZEMO_PORTS } from './haldzemo.js';

// Explicit operation for a user-requested update, never an automatic migration
// of someone else's edited project. Preserve cable IDs, routes and placements.
export function rewireHaldzemo(input, at = new Date().toISOString()) {
 const state = structuredClone(input);
 const update = doc => {
  const displays = doc.instances.filter(i => i.id === HALDZEMO_ID || doc.custom?.find(p => p.id === i.id)?.modelId === HALDZEMO_ID);
  for (const display of displays) {
   for (const wire of doc.connections) {
    const side = wire.from.startsWith(display.id + ':') ? 'from' : wire.to.startsWith(display.id + ':') ? 'to' : null;
    if (!side) continue;
    const other = side === 'from' ? 'to' : 'from', pin = wire[side].split(':')[1];
    const [carrier, port] = wire[other].split(':');
    if (pin === 'vcc' && ['h-3v3','h-5v'].includes(port)) wire[other] = carrier + ':h-5v';
    if (pin === 'dc' && ['h-d2','h-d9'].includes(port)) wire[other] = carrier + ':h-d9';
    wire.note = 'User-reported physical harness, 2026-11-19: 5V/VBUS supply; DC on D9; touch polled, no interrupt. Verify 5 V source and touch-bus pull-up levels. ' + wire.note.replace(/3\.3 V reduced-brightness supply needs a current-budget check\./g, '').replace(/LED, MISO and SD_CS stay open/g, 'LED, MISO, CTP_INT and SD_CS stay open');
   }
   doc.connections = doc.connections.filter(c => ![c.from,c.to].includes(display.id + ':tp-int'));
   const part = doc.custom?.find(p => p.id === display.id);
   if (part) { part.electrical = HALDZEMO.electrical; part.ports = structuredClone(HALDZEMO_PORTS); }
   doc.notes.push({part:display.id, at, text:'Actual wiring update: VCC → 5V/VBUS, LCD_RS/DC → D9; CTP_INT removed. Touch is polled. All component placements are preserved. ' + HALDZEMO.electrical});
  }
  doc.updatedAt = at;
 };
 update(state);
 for (const variant of state.layouts?.variants || []) update(variant.document);
 if (state.layouts) { const active=state.layouts.variants.find(v=>v.id===state.layouts.activeId); const snapshot=structuredClone(state); delete snapshot.layouts; active.document=snapshot; }
 return state;
}
