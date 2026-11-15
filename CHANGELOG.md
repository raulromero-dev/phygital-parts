# Changelog

## 2026-11-14 · Codex for Raul · main · research progress and agent distribution

Enabled Vercel Web Analytics and added its production-only client integration.
Replaced loading indicators with a ship evading a four-pin cable, respecting
reduced motion and both themes. First-project research stays inline, streams
actual provider phases/search counts, supports cancellation, and presents an
explicit review action. Project/product links are always visible in the composer.

Added AGENTS, architecture, part-authoring and contribution guides, an MIT
application license and the discoverable Phygital skill with a public download.
Existing CAD and attribution are retained. Research stream regression coverage
includes fragmented events, invalid/incomplete results, errors and cancellation.

## 2026-11-14 · Codex for Raul · main · quieter chat composer

Removed the default “This assembly” label and its empty space from Codex chat.
Selected parts still show their removable context chip.

## 2026-11-14 · Codex for Raul · main · homepage and Codex branding

Removed the Phygital shortcut from the homepage examples and placed Makeup
cyberdeck first. Direct original-project URLs remain available. Replaced
Ask codex labels with the Codex symbol and “codex” in the floating launcher,
chat header and part finder. Retained MIT icon attribution.

Validation: production build, existing 64 tests, and browser checks of homepage,
launcher and chat header.

## 2026-11-14 · Codex for Raul · main · quieter finder and makeup cyberdeck

Reduced Find parts copy: moved interfaces and research-card descriptions into
Details, shortened the search placeholder, and removed repeated form headings,
subtitles and helper lines. Kept purchase actions and dimensions visible.

Added a separate makeup-cyberdeck starter with M5Stack Cardputer-Adv manufacturer
STL, built-in connection notes and original blush compact, mirror and hinge
concepts. Retained MIT attribution and downloadable source files. No invented
external keyboard/display/battery harnesses. Hinge interference and mechanical
closure remain review items. Starter views now frame the complete assembly.

Validation: 64 tests and production build; browser checks cover the new model,
collapsible finder details and both research forms.

## 2026-11-14 · Codex for Raul · main · one chat entry point

Removed the sidebar and mobile-menu assistant entries. The right-side floating
Ask codex button is now the only chat launcher. Part search retains its own
Ask codex research tab. Production build passes.

## 2026-11-14 · Codex for Raul · main · separate starters and floating assistant

Added original Phygital compact, bench and wide layouts, with project-specific
inventory context and links to the original repository and workbench. Each
starter now has a distinct URL, autosave, snapshot store and chat history.
Added a separate SenseRing assembly using its original board, curved battery,
inner-shell and outer-shell CAD. Retained editable sources and GPL-3.0 license,
provided a downloadable source bundle, and identified fabrication, battery
sourcing and curved-clearance review requirements.

Added an optional floating Ask codex chat with expand/minimize controls,
selected-part context, local history at the bottom, and reviewed adjustments
for position, rotation, dimensions, enclosure and notes. Changes are validated,
undoable and rejected when the assembly no longer matches the proposal.
The visitor's API key stays in tab memory. No model labels appear in the UI.
Grouped mobile header actions in a compact menu, made the homepage circuit
animation visible in dark mode, and slightly increased corner radii throughout.

Validation: all 62 tests and the production build pass. A local mock response
verified selected-part context, review, apply and undo without a paid API call.
Browser checks verified separate original/ring assemblies, persisted chat,
mobile menu sizing and expanded chat bounds. A live response requires a visitor
key with model access and credits.

## 2026-11-14 · Codex for Raul · main · prebuilt examples and simpler homepage

Changed the smartwatch starter to a LiPol LPR553535 round 600 mAh candidate
with a dedicated Blender planning mesh, source drawing and sample-order link.
Flagged its 300 mA charge ceiling against the board’s approximately 485 mA
setting; kept battery wiring on hold. Untouched saved starters update on reload;
edited or wired Adafruit battery layouts retain the original part.
Added an outline board wordmark, a blue/green headline board that spins once
on arrival, and very subtle animated circuit traces with reduced-motion support.
Removed Start empty, the extra tagline, model label, separate sample link and
prompt resize handle. Custom builds require a non-empty prompt.
All four example chips now load prebuilt layouts and mapped connections locally.
The air monitor reuses Sensirion SCD4x CAD plus Seeed Grove PCB data; wearable
haptics reuse the reviewed four-channel hub plan.

Connected phygitalstudio.app to the Vercel project.

Validation: production build and all 54 tests pass, including all four example
layouts, SCD41 netlist, haptic channel separation and saved-battery migration.
Browser checked all four examples, selectable cable mappings, required prompt,
round battery and mobile dark-mode homepage.

## 2026-11-14 · Codex for Raul · main · smartwatch starter

Added a no-key smartwatch template with Seeed XIAO ESP32-S3, Round Display,
included antenna allowance and a 500 mAh battery candidate. Mapped all 14
header contacts from the published v1.1 board and the direct U.FL coax route.
Battery remains on hold and unconnected until an adapter is selected. Added
purchase links, open-source examples, case reference and fit/pin review notes.
Reused existing XIAO CAD and battery/antenna meshes; generated display geometry
from the manufacturer PCB outline and placements with approximate bodies.
Moved the homepage orange accent to the board SVG, removed the logo dot and
disabled Start empty. Header connections render as contacts, not cable loops.

Validation: production build and 49 tests pass, including import/export and
manufacturer net-map checks. Browser verified template creation, persisted
assembly, clickable header mapping and mobile dark-mode layout.

## 2026-11-14 · Codex for Raul · main · standalone parts workbench

Extracted the hardware studio into an independent product repository and Vercel
project. Added a generic prompt/photo/project-link start, library search and
categories, AI research and URL import, visitor API-key connection, sourced
proposal review, purchase buttons, reusable CAD instances and custom envelopes.
Retained layout, connection mapping, themes, colors, measurements and exports.
Simplified homepage and part-card copy and added a tiny orange brand accent
and a small Arduino-style SVG after the headline.
Removed the assumed XIAO architecture from empty-project checks and the personal
bench-photo UI. No sensor firmware is included or changed.

GPT-6 Astra is called server-side through the Responses API with web search,
image input and strict structured output. Keys are tab-memory only; suggestions
are reviewed before application and incomplete/error responses do not add parts.
Project validation preserves bounded source links, colors and custom contacts.

Validation: production build and 45 tests pass, including new research and
project-data tests. API success is covered using a mocked upstream response;
a live paid response needs the visitor's own OpenAI key and credits. Browser
checks and production verification are recorded in the task handoff.
