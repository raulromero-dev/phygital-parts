# Changelog

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
