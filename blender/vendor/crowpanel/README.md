# CrowPanel Advance 2.8 manufacturer assets

These files retain the authorship of **Elecrow** and **Espressif Systems**. They
are source assets for fit planning, not original Phygital CAD. Original STEP,
Eagle and PDF files are unchanged; their URLs and SHA-256 hashes are in
[sources.json](sources.json). Retrieved November 14, 2026. No separate open-source
license accompanied these downloads; they are not relicensed as project code.

## Reused geometry

- Elecrow's [`advance-hmi2_8-20260126.stp`](https://github.com/Elecrow-RD/CrowPanel-Advance-2.8-HMI-ESP32-S3-AI-Powered-IPS-Touch-Screen-320x240/tree/master/3D%20file)
  is the current v1.2 assembly in its official repository. The folder README calls
  the new file `advance-hmi2_8-20260116`; the actual filename ends `20260126`.
  The STEP supplies the PCB/mechanical button bodies, LCD/touch stack, both
  USB-C ports, two wireless-module sockets, I2C, UART1, UART0, battery and speaker
  connectors, including socket interiors.
- Espressif's [ESP32-S3-WROOM-1 STEP](https://www.espressif.com/sites/default/files/3dmodel/ESP32-S3-WROOM-1%203D%20Model.STEP)
  supplies the complete module with its real PCB antenna, shield, castellated
  contacts, and internal components. Its placement follows Elecrow's Eagle U1
  origin and R90 rotation. This is **WROOM-1**, with a PCB antenna; the model
  intentionally has no U.FL socket. WROOM-1U is a different module.
- Elecrow's [`1.2-new_button` Eagle board and schematic](https://github.com/Elecrow-RD/CrowPanel-Advance-2.8-HMI-ESP32-S3-AI-Powered-IPS-Touch-Screen-320x240/tree/master/Eagle_SCH%26PCB/1.2-new_button)
  supply actual board footprint positions, pads, silkscreen and electrical nets.
  Small package bodies, microSD shell detail, surface finishes and their heights
  are illustrative additions. Parts whose values contain `NC` are omitted.
  Geometry does not imply an electrically tested build.

The coarse ESP32 stand-in fused into Elecrow's PCB solid is removed above the
PCB surface and replaced with Espressif's complete STEP module; otherwise its
3.2 mm proxy shield would hide the real module's 3.1 mm shield. A soldermask
plane closes the PCB surface under the replacement. The original STEP source
remains unchanged.

The optional acrylic parts `SK28`, `XK`, `SG28` (STEP bodies 53, 54, 56), plus
case screws/standoffs (bodies 72–79), are excluded. The optional plug-in wireless
module is also absent: the two sockets remain visible. The STEP model remains
unchanged on disk, so the case can be recovered for future comparisons.

## Size and coordinate convention

The **bare PCB outline is 81 × 54 mm**, from Eagle's dimension layer. The reused
bare STEP geometry has an 81 × 54.3646 × 15.9 mm envelope, including connector and
button overhang. The display's added 0.015 mm surface layer brings the exported
planning model to **81 × 15.915 × 54.3646 mm in browser X/Y/Z order**.

Elecrow separately publishes 85.4 × 58.5 × 15.5 mm overall. That is not the bare
PCB envelope and is not used to scale this model. The latest STEP case itself
also differs from the older published width; verify the delivered revision
before an enclosure is fabricated. Exported fit geometry does not supply cable
bend, plug body, insulation or assembly clearance.

- Browser **X**: width, left/right on the landscape screen.
- Browser **+Y**: display face. Rear connectors point toward **−Y**.
- Browser **Z**: board length, aligned with Eagle +Y.
- Native STEP is translated and rotated 180° about X before glTF conversion.
  No dimensional scaling is applied. The overlapping ESP32 stand-in and optional
  case are removed as described above.
- The GLB contains no case, cables or implied external-antenna connection.

`src/crowpanel-ports.json` records normalized visual docking anchors in half-envelope units [-1,1]
for UI selection. Pin numbers and nets are from the schematic; contact heights
and socket centrelines are approximate drawing anchors, not precise terminal
measurements. The notes distinguish this from manufacturer CAD dimensions.

## Verified connector nets

The [official interface documentation](https://media-cdn.elecrow.com/wiki/CrowPanel_Advance_2.8-HMI_ESP32_AI_Display.html)
and the original v1.2 schematic agree on these useful interfaces:

| Ref | Manufacturer connector name | Pin 1 | Pin 2 | Pin 3 | Pin 4 |
| --- | --- | --- | --- | --- | --- |
| J7 I2C | HY2.0-4P | SCL / GPIO16 | SDA / GPIO15 | 3V3_OUT2 | GND |
| J6 UART1 | HY2.0-4P | RX / GPIO18 | TX / GPIO17 | 3V3_OUT1 | GND |
| J5 UART0/power | XH2.54-4P | RX / GPIO44 | TX / GPIO43 | +5V_IN | GND |
| J10 battery | PH2.0-2P | VBAT | GND | — | — |

The XH package's actual Eagle pad pitch and STEP pin pitch are 2.5 mm, although
Elecrow names it `XH2.54-4P`. Match the keyed housing, not a generic 2.54 mm jumper
label. I2C and UART1 are 3.3 V outputs. Battery documentation specifies 3.7–4.2 V.
The battery positive contact is on the +X side in the exported model; cable
polarity must still be checked before connecting the user's existing battery.
HY2.0, Grove, PH2.0 and XH are not interchangeable names for the same housing.

J3 is USB-C through CH340K for UART0; J4 is the ESP32's native USB/OTG. The speaker
connector J2 carries the amplifier outputs `ROUT+` / `ROUT−`, not GPIO power or a
haptic motor driver. The screen and touch panel already connect internally;
no external LCD ribbon to the XIAO is required. This board is a separate ESP32-S3
controller candidate, and port mapping does not mean existing firmware is ported.

## Rebuild only this asset

From the repository root:

```sh
node blender/convert-crowpanel.cjs
blender --background --python blender/crowpanel.py
```

Add `-- --render` to the Blender command to regenerate the front/rear diagnostic
PNGs. Open `blender/crowpanel-advance-28.blend` for the separately editable bodies.
The GLB batches bodies by material to reduce browser draw calls. Tessellation
uses 0.015 mm linear and 0.15 rad angular deflection, preserving imported normals.
Existing parts-library assets are untouched.

## Visual verification

`public/reference/crowpanel-front.png` and `crowpanel-back.png` are Phygital
renders of the derived model described above. They are visual fit references,
not manufacturer photos. Original Elecrow product/PCB images were consulted
from the [official Wiki](https://media-cdn.elecrow.com/wiki/CrowPanel_Advance_2.8-HMI_ESP32_AI_Display.html)
for comparison; they are not redistributed with this model.
