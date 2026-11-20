# Screen firmware previews

Open **Simulate** inside any project. Choose the display/component and firmware,
then a test scene. Tap the rendered screen, adjust **Test inputs**, pause/reset,
or save a PNG. The parts list and Codex chat stay available. **Save preview to
project** retains the binding with that layout, including an imported bundle.
Copies, account saves and JSON exports preserve it. Each layout can use a different
preview. Public sharing currently omits private preview bindings and imported
code; visitors can still try the bundled demo without signing in.

The Haldzemo profile compiles the real `tft_ui.h`, `tft_fonts.h` and `heat_rule.h`
from [the original Phygital firmware](https://github.com/raulromero-dev/phygital),
using its `tools/tft_sim` Arduino/ILI9341 stubs and real Adafruit GFX. The browser
runs those C++ drawing and touch handlers as WebAssembly. The eight named scenes
come from the original `scenes.txt`. Inputs are synthetic; this does **not** emulate
the full ESP32, Wi-Fi/Bluetooth, I²C/SPI timing, electrical compatibility or physical
touch calibration. The display remains at its native pixel resolution; choosing
another part does not automatically port firmware to a different panel.

## Update the Phygital renderer

`firmware-preview/sources.json` pins the original revision and file hashes. The
unchanged source snapshot is in `firmware-preview/vendor/phygital`; Adafruit GFX
retains its BSD notice in `vendor/adafruit-gfx/license.txt`. The adapter reuses the
original renderer, touch dispatch and synthetic data helpers. Source-level UI
changes belong in the original firmware repository, then should be brought into
this snapshot with updated hashes. Do not hand-redraw its screens in JavaScript.

Install [Emscripten](https://emscripten.org/docs/getting_started/downloads.html),
activate its environment, then run:

```sh
python3 scripts/build-firmware-preview.py
npm test
npm run build
```

`EMXX=/path/to/em++` can select the compiler explicitly. This generates
`public/firmware/phygital-tft.json` and its `.wasm`; the host needs no compiler.
The JSON embeds the compiled module, scene names, controls, source revision and
SHA-256. A pinned native simulator comparison is in
`tests/fixtures/firmware-native-hashes.json`: all eight browser frames match the
original native renderer at RGB565 precision. Updating the source requires
rebuilding native references and reviewing visual changes, not blindly changing
test expectations.

## Other projects: bring your actual screen renderer

Use **Simulate → Use your own firmware → Import preview**. Supply a
`.json` bundle built from your code. No backend credentials are required, no code
is uploaded to a compilation service, and no executable JavaScript is accepted.
This is an explicit compiled-artifact workflow: pasting an arbitrary repository
URL does not automatically emulate its hardware.

Write a C/C++ adapter around your display library's framebuffer. Stub clocks and
hardware inputs with test data; keep the real drawing functions. Export these
C ABI functions (use `extern "C"` in C++):

| Export | Contract |
| --- | --- |
| `sim_init()` | Initialize the renderer once. |
| `sim_width()`, `sim_height()` | Native dimensions, each 16–1024 pixels. |
| `sim_frame()` | Byte offset of `width × height` contiguous little-endian RGB565 pixels in exported `memory`. |
| `sim_scene(int index)` | Reset to a named fixture from the manifest. |
| `sim_step(int ms)` | Advance simulated time (0–1000 ms). |
| `sim_tap(int x, int y)` | Dispatch a native-pixel touch. |
| `sim_input(int id, double value)` | Optional bounded sensor/control override. |
| `double sim_get_input(int id)` | Optional readback to keep controls in sync with scene/touch state. |

Return promptly. The host steps at up to 10 Hz; touch, scene changes and controls
request new frames. The module runs in a disposable worker, with a request timeout
and no filesystem/network/DOM access. Define one memory with an explicit maximum
of 512 pages (32 MB) or less. The only permitted imports are no-output WASI
`fd_write`, `fd_close`, `fd_seek`, and `proc_exit` stubs; no host environment is
provided. Bundles are limited to 600 KB of compiled WASM, 32 scenes and 12 inputs.

The independent [minimal adapter](../firmware-preview/examples/minimal.c) shows
the interface on a different 128 × 64 screen. It is deliberately a sample UI,
not the user's device firmware. Compile and package it:

```sh
emcc firmware-preview/examples/minimal.c -O2 --no-entry \
  -sSTANDALONE_WASM=1 -sFILESYSTEM=0 -sINITIAL_MEMORY=16777216 \
  -sALLOW_MEMORY_GROWTH=0 \
  '-sEXPORTED_FUNCTIONS=["_sim_init","_sim_width","_sim_height","_sim_frame","_sim_scene","_sim_step","_sim_tap","_sim_input"]' \
  -o /tmp/screen-example.wasm
node scripts/package-firmware-preview.mjs /tmp/screen-example.wasm \
  firmware-preview/examples/manifest.json /tmp/screen-example.json
```

Replace the example renderer and manifest with your own source, native dimensions,
scenes and input ranges. A source URL and revision make provenance reviewable.
Chat can explain a preview's context and inspect attached screen photos; it
cannot rewrite or compile arbitrary firmware source inside the hosted app.

## Current physical Haldzemo harness

The user-reported November 19 harness has ten jumper conductors: VCC → 5V/VBUS,
GND → GND, CS → D0, reset → D6, DC → D9, MOSI → D10, SCK → D8, touch SCL → D5,
touch reset → D7 and touch SDA → D4. LED, MISO, touch interrupt and SD-CS are open.
Touch is polled. The project records this wiring separately from compatibility
review: verify the actual 5 V source, current budget and SDA/SCL pull-up voltage
before treating the 3.3 V bus as electrically verified. VBUS does not establish
a regulated 5 V source from the LiPo alone. No automatic rewire migration changes
other users' existing documents.
