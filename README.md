# Phygital Parts

A standalone hardware workbench for discovering components, visualizing their
fit, planning real cables, and deciding what to buy. Start with a description,
a reference photo plus a prompt, or public links to a project or product.

The homepage also offers a **Smartwatch template** without an API key: a Seeed
XIAO ESP32-S3, Round Display, included antenna allowance and Adafruit PID 1578
battery candidate. It maps the 14 direct header contacts and antenna coax.
The battery remains unconnected pending a verified connector adapter. Published
PCB data and the existing XIAO CAD are reused; thickness, antenna geometry and
the proposed enclosure are estimates. Open the template's build notes for
manufacturer purchase links, pinouts, open-source examples and printable case.

This repository is independent of the original Phygital sensor firmware. It
contains the product experience and a reusable reference-model library, not the
surveillance device's firmware or detection rules.

## Use

1. Describe a project on the homepage, or open an empty workspace or sample.
2. Connect your own OpenAI API key to use **GPT-6 Astra**. Research uses the
   Responses API, image input, web search and structured output.
3. Review the proposed parts, sources, unknowns and conductors. Select the parts
   to add. An AI response never silently replaces the current assembly.
4. Use **Find parts** to search the local library, ask AI, paste a product URL,
   or add a component manually. Purchase links are prominent on cards and in
   the part inspector. Search-result links are labeled as searches; stock and
   prices are not promised.
5. Arrange parts in 3D, adjust dimensions, set enclosure bounds, inspect fit
   checks, and map individual contacts in **Connections**. Export JSON to move a
   project between browsers, GLB for Blender, or CSV for the cable plan.

The interface supports light/dark mode and Color/Mono component rendering.
New projects start empty. The pocket thermal camera is an optional example.
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
runs Vite and the same `/api/research` handler used in production. `npm run dev:ui`
is frontend-only; use the normal dev command to exercise research.

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
- A research request sends the key over HTTPS to this app's server, which relays
  it only to `https://api.openai.com/v1/responses`. This is a server-mediated
  integration, not a claim that the app server never sees the key.
- Prompts, supplied links, the chosen image and relevant assembly details are
  sent to OpenAI when research is requested. Requests set `store: false`; this
  does not override OpenAI's account-level retention or abuse-monitoring policy.
- Projects and notes stay in browser storage unless exported or included in an
  explicit research request. Images and credentials are not saved in projects.
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

Vercel builds `dist/` and deploys `api/research.js` as a Node function. No API key
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
- `src/viewer.js`, `proxy.js`: Three.js scene, source model reuse and approximate
  geometry for custom components.
- `src/engine.js`, `connections.js`: fit checks, project validation and pin maps.
- `server/research.mjs`, `schema.mjs`: GPT-6 Astra request, input limits, structured
  output validation and safe error handling.
- `public/models/`: reusable GLBs. `blender/vendor/README.md` and source manifests
  document manufacturer geometry, attribution, licenses and approximations.
- `tests/`: fit/wiring regression tests and API/project-data integration tests.

## Verification and limits

Tests cover fit and wiring regressions, generic empty projects, duplicate CAD
reuse, source/contact persistence, malicious imports, request limits, image/link
input, refusal, upstream errors, and a mocked successful Responses result.
Browser checks cover the homepage, generic finder, purchase actions, custom
parts, settings and persistence. A successful paid GPT-6 Astra response requires
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
