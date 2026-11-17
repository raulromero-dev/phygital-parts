# Add a part or starter

Start with the exact manufacturer, SKU and revision. Record dimension and
connector evidence, direct purchase URLs, documentation links and what remains
estimated. Current stock/pricing requires a fresh lookup. The app never buys parts.

## Part data

Use `src/cyberdeck.js` or `src/air-monitor.js` as focused examples and
`src/catalog.js` for integration. A catalog record has a stable `id`, readable
`name`/`short`, `kind`, dimensions `[width,height,depth]`, color, interface,
electrical/placement notes, confidence and provenance. Procurement and evidence
links serve different purposes; keep purchase actions direct and clearly labeled.

`src/product-data.js` controls library filtering, duplication and proposal
application. A part ID accepted by the catalog is not automatically accepted by
all specialized checks; inspect callers and add the part where appropriate.

## Models

Prefer matching manufacturer CAD already in `blender/vendor/`. Preserve the
original files and attribution. Conversion changes and native dimensions belong
in the source manifest and part notes. Do not claim a proxy matches an unknown
revision. Keep checked-in GLBs in `public/models/<id>.glb` so clones run without
Blender. Avoid committing intermediate caches or `.blend` backups.

Examples from the repository root (Blender must be installed and on PATH):

```sh
node blender/convert-cad.cjs lcd-27579
blender --background --python blender/generate.py -- lcd-27579
blender --background --python blender/makeup-cyberdeck.py
```

On macOS, Blender may be at
`/Applications/Blender.app/Contents/MacOS/Blender`. More workflows are documented
beside their vendor files. Some generators rebuild an entire family; inspect
their export list before running. The existing `npm` scripts do not include
a universal model-generation command.

## Connections

`connections.js` registers external ports and internal blocks, including
specialized modules. A port has stable `id`, readable label, signal, voltage rail,
group and normalized anchor. A connection references `partId:portId` at both ends,
plus cable type, bundle, length, color, status and notes. Follow one actual
connector's signal path end-to-end; do not substitute connector pitch for housing
compatibility or wire color for polarity. Distinguish motor power from control.

Integrated devices should expose their internal mapping without invented jumper
cables. The Cardputer example keeps its internal screen/keyboard/battery wired
inside the component and exposes only the documented external contacts.

## Starter assembly

Add the route in `routes.js`, a prebuilt state in `templates.js`, and an entry in
`EXAMPLES`. Include its enclosure, initial placement, documented connections,
notes and sources. Give it a distinct namespace so it cannot reuse another
starter's saved state. Keep original Phygital defaults isolated.

Validate state and JSON round trips, endpoint existence, duplicated model/port
reuse and relevant voltage/bus/geometry checks. Inspect the real rendered model
and both sides of its connectors. Explain limits in part details; concise cards
and purchase links should remain easy to scan.

The Haldzemo example is split between `src/haldzemo.js` (listing evidence and
14-pin map), `src/haldzemo-assembly.js` (additive comparison) and
`src/jumper-geometry.js` (generic mated connector bodies). Run the local server
and visit `/tests/fixtures/haldzemo-preview.html` to inspect both sides and click
the jumpers. It contains only a generic catalog assembly, never private projects.
