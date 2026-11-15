# Seeed Round Display for XIAO v1.1

Original Eagle board, downloaded 2026-11-14 from Seeed's published design archive:
https://files.seeedstudio.com/wiki/round_display_for_xiao/SeeedStudio_Round_Display_for_XIAO_v1.1_SCH&PCB_230407.zip

Manufacturer documentation and attribution:
https://wiki.seeedstudio.com/get_start_round_display/
https://wiki.seeedstudio.com/seeedstudio_round_display_usage/

`blender/smartwatch.py` reuses the curved PCB outline, component placement centres,
J4/J5 socket centres and contact spacing. Glass, passive bodies, connectors and
all component heights are approximate; the dial is illustrative. Published
specifications disagree on 39 mm vs 43 mm: the product page gives 43 mm, while
the wiki describes the 39 mm glass. The app uses a 43 × 43 × 10 mm planning envelope.

The XIAO model reuses the existing Seeed manufacturer STEP-derived GLB. The antenna reuses an existing planning mesh, with qualified dimensions.
The round battery uses `blender/round-battery.py`, based on the drawing below.
The battery is not wired: its PHR-2 connector needs a verified adapter to J1,
and its 300 mA maximum charge current is below the board’s listed 485 mA.

Manufacturer printable case reference (linked, not represented as a validated fit):
https://files.seeedstudio.com/wiki/round_display_for_xiao/Round-Display-shell-3D-Model.stl

Open-source Arduino examples (MIT; linked, not bundled):
https://github.com/Seeed-Studio/Seeed_Arduino_RoundDisplay

Round battery source, checked 2026-11-14:
https://www.lithium-polymer-battery.net/iec62133-certified-lpr553535-3-7v-600mah-2-22wh-round-lithium-polymer-battery-with-pcm-wires-jst-phr-2/
https://www.lithium-polymer-battery.net/wp-content/uploads/2024/02/LPR553535-600mAh.pdf

Drawing specifies a 35 mm diameter body with one flat edge, 32 mm overall body
depth and 5.5 mm maximum thickness; 50 ± 3 mm leads and the PHR-2 plug need
additional space. The mesh omits free leads and plug; PCM, foil and tape are
illustrative. Standard charging is 120 mA, maximum 300 mA. The original Adafruit
part remains in the library to preserve saved or imported user-edited projects.
