# Phygital Parts

Live at [phygitalstudio.app](https://phygitalstudio.app/).

A standalone hardware workbench for discovering components, visualizing their
fit, planning real cables, and deciding what to buy. Start with a description,
a reference photo plus a prompt, or public links to a project or product.

The homepage offers six **prebuilt starters** without an API key: Phygital,
thermal camera, air monitor, wearable haptics, smartwatch and smart ring.
Each opens a populated 3D layout with proposed connections, sourcing links
and review notes. Phygital includes the original compact, bench and wide layouts.

Each starter has its own URL and browser-storage namespace:
`/examples/thermal-camera`, `/examples/air-monitor`, `/examples/wearable-haptics`,
`/examples/smartwatch`, `/examples/smart-ring`, and
`/projects/phygital?layout=compact` (also `bench` or `wide`). Autosaves,
snapshots and chat histories stay separate. The Phygital route retains the
original project inventory, notes and source context, with links to its firmware
repository and original workbench. Existing root-page projects remain available.

The smart ring reuses SenseRing's four original CAD meshes: sensor board,
curved battery, inner shell and outer shell. It is a custom fabrication reference,
not a plug-in kit. Battery availability and curved clearances need review.
Editable CAD, PCB files, source meshes, conversion script and GPL-3.0 license
are available at `/reference/sense-ring/source.zip`.

The smartwatch uses a Seeed
XIAO ESP32-S3, Round Display, included antenna allowance and LiPol LPR553535
round 600 mAh battery candidate. It maps the 14 direct header contacts and antenna coax.
The battery remains unconnected: its 300 mA charge limit is below the board’s
approximately 485 mA setting, and its PHR-2 plug requires an adapter. LiPol lists
a five-piece minimum for stocked samples; confirm availability and pricing. Published
PCB data and the existing XIAO CAD are reused; thickness, antenna geometry and
the proposed enclosure are estimates. Inspect each part for manufacturer purchase links and pinouts; the project
includes open-source examples and a printable case reference.

This repository is independent of the original Phygital sensor firmware. It
contains the product experience and a reusable reference-model library, not the
surveillance device's firmware or detection rules.

## Use

1. Describe a project on the homepage, or choose a prebuilt starter.
2. Connect your own OpenAI API key to use **GPT-6 Astra**. Research uses the
   Responses API, image input, web search and structured output.
3. Review the proposed parts, sources, unknowns and conductors. Select the parts
   to add. An AI response never silently replaces the current assembly.
4. Use **Find parts** to search the local library, ask codex, paste a product URL,
   or add a component manually. Purchase links are prominent on cards and in
   the part inspector. Search-result links are labeled as searches; stock and
   prices are not promised.
5. Arrange parts in 3D, adjust dimensions, set enclosure bounds, inspect fit
   checks, and map individual contacts in **Connections**. Export JSON to move a
   project between browsers, GLB for Blender, or CSV for the cable plan.
6. Open **Ask codex** for a floating, expandable chat. Select a part to attach
   its context, then request movement, rotation, corrected dimensions, enclosure
   changes or review notes. Review each proposal and choose **Apply changes**;
   the edit is undoable. Proposals are rejected if the assembly has changed
   since the request. The assistant does not edit wiring or add parts; use
   Connections and Find parts for those actions.

The interface supports light/dark mode and Color/Mono component rendering.
An outline board logo, a one-turn entrance animation and very faint circuit
traces decorate the homepage in both themes; reduced-motion preferences disable
animations. Controls use modestly rounded corners. On mobile, a compact project
menu groups key connection, theme, layouts and export.
Custom builds require a typed description; there is no Start empty shortcut.
All starters load locally without an AI call. The air monitor reuses
Sensirion sensor CAD and Seeed PCB data; its USB-C supply, firmware, ventilation
and peak-current budget need review. Haptics use four separate multiplexer
channels with the existing power-budget checks.
Known exact parts reuse the existing CAD/model library. Unrecognized parts use
clearly labeled, dimensioned parametric envelopes; they do not magically acquire
manufacturer geometry. Research suggestions and pinouts need review.

## Local development

Node 22+ and npm are recommended.

```sh
npm ci
npm run dev
```

Open the printed local URL (default `http://127.0.0.1:5179`). The local server
runs Vite and the same `/api/research` and `/api/adjust` handlers used in production.
`npm run dev:ui` is frontend-only; use the normal dev command to exercise either API.

```sh
npm test
npm run build
```

## API keys and data

- Each visitor brings their own OpenAI API key. There is no owner-funded key or
  shared spending pool. OpenAI bills the visitor's API project.
- Keys remain in JavaScript memory for that tab. They are not stored in
  localStorage, project files, snapshots, URLs, analytics or application logs.
  Reload or **Disconnect** removes the in-memory key.
- A research or adjustment request sends the key over HTTPS to this app's server, which relays
  it only to `https://api.openai.com/v1/responses`. This is a server-mediated
  integration, not a claim that the app server never sees the key.
- Prompts, supplied links, the chosen image and relevant assembly details are
  sent to OpenAI when research is requested. Adjustments send assembly details,
  selected-part context and the last eight chat messages. Requests set `store: false`; this
  does not override OpenAI's account-level retention or abuse-monitoring policy.
- Projects, notes and the last 40 chat messages stay in browser storage unless
  exported or included in an explicit request. Pending proposals are not restored
  after reload. Chat history is anchored above the composer with newest messages
  at the bottom. Images and credentials are not saved in projects or chat history.
- Supports one PNG/JPG/WebP up to 2 MB, five public links, 20 returned parts,
  60 assembled parts and 40 custom parts. Research has a 240-second upstream
  timeout, bounded model output/tool calls, and cancellation in the UI.
- The server never fetches arbitrary supplied URLs itself. OpenAI's web search
  reads public sources; private repositories and login-only pages are not
  automatically accessible. Errors, refusal and incomplete output never add parts.

## Deployment

The Vercel project is `phygital-parts`, separate from the original studio.

```sh
vercel link --project phygital-parts
vercel deploy --prod
```

Vercel builds `dist/` and deploys `api/research.js` and `api/adjust.js` as Node functions. No API key
or database environment variable is required. Function duration is configured
for up to 300 seconds; the hosting plan must support it. Public access is an
intentional product setting. Custom domain registration and payments are not
part of this repository.

## Structure

- `src/product.js`, `product.css`: prompt-first home, key connection, finder,
  research progress and review-before-add flow.
- `src/product-data.js`: safe supplier links, blank projects, duplicate parts,
  placement suggestions and applying research proposals.
- `src/main.js`: workspace, component inspector, wiring editor, notes and export.
- `src/routes.js`, `templates.js`: isolated starter URLs and prebuilt assemblies.
- `src/assistant.js`, `adjustments.js`: floating chat, part context, local history
  and validated, undoable adjustment proposals.
- `src/viewer.js`, `proxy.js`: Three.js scene, source model reuse and approximate
  geometry for custom components.
- `src/engine.js`, `connections.js`: fit checks, project validation and pin maps.
- `server/research.mjs`, `schema.mjs`: GPT-6 Astra request, input limits, structured
  output validation and safe error handling.
- `server/adjust.mjs`: bounded assembly context and structured adjustment output.
- `public/models/`: reusable GLBs. `blender/vendor/README.md` and source manifests
  document manufacturer geometry, attribution, licenses and approximations.
- `tests/`: fit/wiring regression tests and API/project-data integration tests.

## Verification and limits

Tests cover fit and wiring regressions, generic empty projects, duplicate CAD
reuse, source/contact persistence, malicious imports, request limits, image/link
input, refusal, upstream errors, and a mocked successful Responses result.
Browser checks cover the homepage, generic finder, purchase actions, custom
parts, settings and persistence. The 62-test suite also covers separate routes,
original Phygital geometry, ring CAD assembly, adjustment validation and linked
carrier movement. A local mock provider verified chat review, apply and undo;
mobile checks cover the compact menu and expanded chat bounds. A successful paid GPT-6 Astra response requires
a visitor key with model access and credits; no owner credential is bundled.

Bounding-envelope collision checks are planning aids. They do not prove cable
bend radius, connector mating, electrical safety, firmware compatibility,
thermal performance, or manufacturability. Exact CAD revision, source dimensions
and delivered hardware must be checked before purchase and assembly.

## Model provenance

Third-party models, fonts, photographs and source CAD retain their original
licenses and authorship. See `blender/vendor/README.md`, the vendor `sources.json`
files, image `.source.json` files and `public/fonts/*LICENSE.txt`. This repository
does not relicense manufacturer assets or claim vendor endorsement. Blender
source scripts and vendor files are retained; binary working `.blend` files and
the original user's bench photograph are not copied into this product.

OpenAI implementation references:
- https://developers.openai.com/api/docs/models/gpt-6-astra
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/docs/guides/structured-outputs
