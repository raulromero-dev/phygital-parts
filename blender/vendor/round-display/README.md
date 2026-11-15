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

The XIAO model reuses the existing Seeed manufacturer STEP-derived GLB. Battery
and antenna reuse existing planning meshes, with explicitly qualified dimensions.
The battery is not wired: its PH2.0 connector needs a verified adapter to J1.

Manufacturer printable case reference (linked, not represented as a validated fit):
https://files.seeedstudio.com/wiki/round_display_for_xiao/Round-Display-shell-3D-Model.stl

Open-source Arduino examples (MIT; linked, not bundled):
https://github.com/Seeed-Studio/Seeed_Arduino_RoundDisplay
