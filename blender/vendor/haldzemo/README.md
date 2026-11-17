# Haldzemo 2.8-inch LCD — B0G8Z6NS9B

Source: [exact seller listing](https://www.amazon.com/dp/B0G8Z6NS9B), inspected
2026-11-16. The front/rear product photos, dimension graphic, package list and
14-pin table are the evidence. No matching manufacturer CAD was located.

This is a **photo-based Blender reconstruction**, not manufacturer CAD. Overall
50 × 86 × 14.28 mm, glass 50 × 69.20 mm, active area 43.60 × 58.05 mm and header
pitch 2.54 mm follow the listing. Mounting hole centres, rear package geometry,
glass placement, heights and connector details are estimated. Screen is ILI9341V
SPI; touch is FT6336G I²C. Check the delivered revision before wiring or making a case.

The rear P3 header has pin 1 VCC at the right when viewed from behind, header at
the bottom. Pins project perpendicular to the PCB. The model maps 14 individually
selectable contact anchors. P2 is a separate 14-pin FPC connector; its bundled
cable is **not** the female-to-male jumper solution.

Run `blender --background --python blender/haldzemo.py` from the repository root
(macOS Blender is commonly `/Applications/Blender.app/Contents/MacOS/Blender`).
Editable `blender/haldzemo.blend` is saved before material batching; the browser
uses `public/models/lcd-haldzemo-28.glb`. X width, Y front/up, Z length, in mm.

The proposed 11-wire plan uses separate nominal 100 mm 2.54 mm female-to-male
jumpers, purchased separately. Their generic 2.4 mm housings and bends are visual
estimates. Rendering does not enforce wire length or certify clearance. LED,
MISO and SD_CS remain disconnected; review 3.3 V dim operation, power budget,
microSD/UART pin reuse and touch firmware before applying power.
