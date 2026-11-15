# Changelog

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
