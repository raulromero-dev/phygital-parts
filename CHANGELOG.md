# Changelog

## 2026-11-20

- Updated Haldzemo defaults to the user-reported working 10-wire harness: VCC on
  5V/VBUS, DC on D9, and polled touch without CTP_INT. Recorded 5 V source and
  touch-bus voltage review separately from the physical map.
- Added an integrated Simulate tab using the actual pinned Phygital screen
  renderer compiled to WASM, eight pixel-matched scenes, touch, sensor inputs,
  pause/reset and PNG export. Added reusable adapters/imports and per-layout saves.
- Added photo upload, paste and drop in the existing Codex chat. Bounded vision
  inputs remain in tab memory; persistent history stores only attachment counts.

## 2026-11-17 · Parallel layout alternatives

- Codex can propose up to four independent alternatives together, with dimensions and checks for review. Saving retains the original active layout.
- Switch, compare, duplicate, rename and remove layouts; each keeps its own parts, placements, notes and cables. Up to eight alternatives persist with account/browser projects and JSON backups.
- Preserve older snapshots, reject stale/invalid proposals atomically, keep undo, and publish only the active assembly in share links.

## 2026-11-17 · Compact and exploded views

- Start with 20% separation, with a Compact action and a slider that reaches the exact saved assembly at 0%. Links with `?view=compact` open directly at zero.
- Separate physical layers in height order, keeping seated XIAO/carrier pairs together, including duplicate boards.
- Return to assembled positions automatically for moving, rotating or mapping contacts; exports and fit measurements retain saved coordinates.
- Route stacked Haldzemo jumpers through available rear-edge clearance or around the header to approach carrier contacts from above. Cable geometry remains illustrative.
- Check the LCD body and its projecting edge header separately, allowing boards to occupy the open underside without resizing components. Fit regions follow the estimated Blender model.

## 2026-11-16 · Haldzemo comparison

- Added the exact B0G8Z6NS9B display, a photo-based Blender model and all 14 rear header contacts.
- Mapped 11 separate female-to-male jumpers for SPI display and I²C touch, with clickable housings and wire paths.
- Added an additive comparison builder that preserves existing layouts, with a separate carrier, battery, thermal camera and four multiplexed haptics.
- Kept model estimates, optional unwired pins, reduced-brightness 3.3 V power and shared-pin checks explicit. Duplicated Grove modules now retain channel and power checks.

## 2026-11-16 · Nearby alternatives

- Enabled web research in selected-part Codex chat and location/deadline context in Find parts.
- Added direct retailer cards with exact/alternative labels, evidence, fit notes and date-aware availability.
- Uncited availability is downgraded, generic stock never implies arrival, and older checks visibly expire.
- Shopping results persist privately; candidates require fit research and review before adding.

## Shareable projects and a simpler header

- Added public read-only share links with account-owned remixes.
- Owners can update the shared snapshot or turn its link off; chat and private project context remain private.
- Shared views allow part/cable inspection without sign-in; editing offers a separate remix.
- Reduced the header to sharing, compact save status and one tools menu on desktop and mobile.

## 2026-11-15 · Accounts, projects and actionable Codex chat

Added My projects on the home page and a Projects menu inside assemblies.
Older autosaves are discovered automatically; independent named copies and
imports receive their own local URLs. Imports no longer replace the open
assembly. Preserved modification times and made local-save status explicit.
Added Google sign-in and a dedicated Supabase project store with ownership RLS,
verified-email claims for privately prepared projects, account-scoped backups,
serialized saves and revision conflicts. New signed-in builds save to accounts;
existing browser projects can be copied to them. JSON exports and local snapshots
remain available. Added deployment/setup guidance and a privacy page.

Codex can now add/duplicate/remove known components, map/remove exact cable
conductors, and apply the reviewed proposal as one undoable edit. Questions have
selectable options and Other, persist in chat, and retain selected-part context.
Fixed decimal placement inputs and made haptic power checks reflect the actual
module count. Validation covers data isolation, conflict handling, invalid
wiring, source CAD reuse, question choices and preservation of older local saves.

## 2026-11-15 · Compact Cable Hop connector

Changed arcade labels to sentence case. Replaced the oversized plug with a
smaller keyed four-pin housing, recessed terminals, retaining latch and thinner
wires, plus a matching open board header. Adjusted the hitbox and docking pose
to the new proportions.

## 2026-11-15 · Text activity and Cable Hop

Replaced the decorative spacecraft loader with concise action text. Added an
optional 3D cable-jumping game inside Codex: detailed four-wire plug, metallic
header obstacles, gold PCB contacts and a chip docking target. Includes touch
and keyboard controls, pause/resume, replay, local best score, background-build
status and graphics cleanup. Removed obsolete three-step loader styles.

Validation: flight physics, collision, pause, scoring and a complete six-gate
run; browser checks for desktop/mobile, themes, controls and text progress.

## 2026-11-14 · Progressive projects and source models

First prompts open isolated project URLs with the Codex window showing real
research and model progress. Validated parts appear as they arrive. Cancel and
reload preserve drafts. New models prefer source CAD (GLB/STL/STEP), then
Astra image reconstructions with bounded geometry and source attribution.
Missing sources retain labeled planning envelopes.

Renamed the repository to phygital-studio. Shortened Connections copy and
changed the landing chip accent from green to gold. Find parts is the sole
component entry point, including library and manual entry; removed the
sidebar library drawer, add-component icon and New project action.

Validation: streamed drafts, stable IDs, cancellation, model provenance, image
inputs, bounded geometry, routes and public asset checks; browser verification
uses mock API responses and actual local STEP geometry, with no paid API call.


## 2026-11-14 · Codex for Raul · main · links in the prompt

Removed the separate homepage links field. The prompt placeholder now says
“share part links”; pasted URLs are extracted into the research request.

## 2026-11-14 · Codex for Raul · main · project heading

Changed PROJECT to Project and matched the Parts heading typography.

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
