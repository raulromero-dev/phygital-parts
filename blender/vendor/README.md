# Reused manufacturer CAD

Source files are retained unchanged. `sources.json` records URLs, authors,
SHA-256 hashes, retrieval date, and conversion changes. These assets retain their
original authorship; they are not original Phygital CAD.

- **Seeed Studio XIAO ESP32-S3 v2 STEP**: official model linked from the
  [XIAO documentation](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/).
  Replaces the custom controller model, including the USB, shield, switches,
  castellations, contacts and small components present in the supplied CAD.
- **Melexis MLX90640 55° STEP**: official sensor assembly from
  [Melexis package models](https://www.melexis.com/en/documents/documentation/packages/package-3d-models).
  Reused inside the thermal module. It describes the sensor, **not** the
  WatangTech breakout board or its connector. Copyright Melexis; provided by
  Melexis for import into technical CAD drawings. No separate open-source license
  was included in the download; it is not relicensed as Phygital code.
- **Seeed XIAO Expansion Board v1.0 200824 Eagle file**: from the
  [carrier documentation](https://wiki.seeedstudio.com/Seeeduino-XIAO-Expansion-Board/).
  Component origins, pad coordinates and mounting bores are reused directly.
  The repository does not claim an exact manufacturer 3D model for this board:
  heights, package bodies and display artwork are custom approximations.

Seeed's [documentation licensing page](https://wiki.seeedstudio.com/License/)
identifies product documents and associated images as CC BY-SA 4.0. Preserve
Seeed attribution and that license on the Seeed-derived model assets. Other
third-party content retains its own terms. Conversion and presentation changes
are listed above and in the manifest; no vendor endorsement is implied.

The remaining parts use the supplied photos and provisional catalog envelopes.
No matching manufacturer assembly was identified for the seller-specific RF
board, battery pack, antenna, motor or cable assemblies. Candidate driver,
charger and strip models remain concepts until an exact product is selected.

## Rebuild

Run `node blender/convert-cad.cjs` with the pinned `occt-import-js` dependency to
convert STEP into a local ignored `blender/.cache/` mesh cache, then run
`blender --background --python blender/generate.py`. Blender imports it and builds the GLBs and editable `.blend` library. The browser needs
neither OpenCascade nor Blender. Source tessellation is 0.015 mm with 0.15 radian
angular deflection. Meshes are combined by material for browser performance;
individual CAD bodies / modeled pieces remain editable in Blender.

The viewer fits these models into the editable planning envelopes. XIAO CAD
proportions are preserved for its initial envelope. User dimension changes and
other proxy envelopes can rescale geometry; use the original STEP for native
manufacturer dimensions, not an exported planning layout. CAD revision, actual
part dimensions, connector order and installed lead lengths still need checking.

## Larger screen and motor-driver additions · November 14, 2026

- **Adafruit PID938 1.3″ STEMMA QT OLED** and **PID5648 MOSFET Driver**:
  original STEP files reused from [Adafruit's official CAD repository](https://github.com/adafruit/Adafruit_CAD_Parts).
  Authorship remains Adafruit Industries. Original files are retained unchanged;
  coordinate conversion and tessellation are recorded in `sources.json`.
  No license file accompanied the CAD download; these assets are not relicensed
  under this project's code license. Vendor geometry is used for fit planning,
  and does not establish that an older retailer revision has installed sockets.
- The 0.96″ QT OLED and Amazon alternatives have custom envelope models; matching
  official 3D assemblies were not found. Their connectors remain proxies.
- The antenna now follows the photographed flat paddle, hinge, collar and
  RP-SMA shell. Overall dimensions are estimates. The listing's 150 mm is the
  **pigtail length**, not a verified antenna-body measurement.
- Carrier external J10/J11 contacts follow the Eagle pads. `src/carrier-contacts.js`
  retains net names and normalized XY pad coordinates for connection anchors;
  height is approximate. Seller thermal connector order remains unverified.

### Grove plug-in haptics and larger displays

`grove-haptic.brd` is Seeed Studio’s unchanged Grove Haptic Motor v0.9 Eagle
board from the [manufacturer resource ZIP](https://files.seeedstudio.com/wiki/Grove-Haptic_Motor/res/Grove_Haptic_Motor_v0.9_Eagle.zip).
The file’s embedded license text names Creative Commons Attribution 4.0 and
links to [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); preserve
Seeed attribution and the linked share-alike terms for the derived haptic asset.
The generator reuses J1, U1, M1 and passive origins within the actual PCB, excluding
panel tooling. Body shapes, heights and the simplified board outline are new
planning geometry. Source hashes and exact retrieval URLs are in `sources.json`.

**Waveshare SKU 27579** now reuses the manufacturer's unchanged STEP assembly
from its official resource ZIP. It includes the rear GH1.25 connector, PCB,
display stack and standoffs. Its native envelope is 50.54 × 73.06 × 10 mm;
the prior 8 mm proxy has been replaced. Original colors and geometry are retained
through tessellation and axis conversion. No separate open-source license was
included; the asset remains Waveshare's work and is not relicensed as project
code. Source, hash and transformations are recorded in `sources.json`.

No matching manufacturer 3D model was located for Waveshare 18366 or the Grove
TCA9548A hub. Their Blender proxies use the display's published width, length
and active area, and the hub's documented connector count. Their depths, hub
dimensions, package bodies and connector positions remain provisional.

Rebuild only these additions without retessellating the existing library:

```sh
node blender/convert-cad.cjs lcd-27579
blender --background --python blender/generate.py -- lcd-27579 lcd-18366 grove-haptic grove-mux
```
