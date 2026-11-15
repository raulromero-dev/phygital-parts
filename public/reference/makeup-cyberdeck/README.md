# Makeup cyberdeck model sources

Cardputer-Adv geometry is reused from M5Stack M5_Hardware (MIT):
https://github.com/m5stack/M5_Hardware/tree/f66b64a1ee5502887d28921f654b24b3b36e9721/Products/K132-Adv_Cardputer-Adv/Structures
Retrieved 2026-11-14. Original STL and license retained unchanged.

The STL includes the assembled device near the origin and detached parts farther
along native Y. The converter keeps the assembled unit within |Y| < 44 mm,
rotates it into the workbench convention and adds approximate presentation
colors, key legends and a display surface. It does not claim these are vendor
finishes or an exact screen image. The source envelope rounds outward to
84.1 x 54 x 19.7 mm; the product guide lists 84 x 54 x 19.6 mm.

The compact base, lid, mirror and hinge are original Blender planning concepts.
They are not measured retail products or print-ready engineering. Review hinge
interference, closure, retention, openings, material and antenna clearance.
The mirror is a material allowance, not a selected SKU. No external battery or
display cable is implied: the Cardputer includes these internally.

Rebuild from repository root:
Blender --background --python blender/makeup-cyberdeck.py

Current product and pin reference:
https://docs.m5stack.com/en/core/Cardputer-Adv
https://shop.m5stack.com/products/m5stack-cardputer-adv-version-esp32-s3

The original K132 Cardputer is EOL. This example uses K132-Adv, with its
current 1500 mAh specification; check the purchased hardware revision.
