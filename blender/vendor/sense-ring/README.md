# SenseRing 1.0 geometry

Upstream: https://github.com/Sense-Ring/Sense-Ring-1.0
Pinned commit: `1f50efc3ce9ab9803d6b6a7e60259bfdb3b6aa2a`, retrieved 2026-11-14.

The original STL, Fusion assembly archive, Eagle schematic and board are retained unmodified. They are licensed under upstream GPL-3.0; see LICENSE. The four GLBs are converted in Blender by `blender/smart-ring.py`, with presentation colors added. Native CAD assembly coordinates are preserved in `src/ring-geometry.json`. The ring uses custom fabricated hardware, not a retail plug-in kit.

The public source bundle at `/reference/sense-ring/source.zip` contains these editable sources, original STLs, license, notice and conversion script. Rebuild with Blender `--background --python blender/smart-ring.py`. Ring shells are hollow; AABB overlap is not proof of interference or fit. Battery tab anchors are approximate, while BAT+ and BAT− functional pad names are read from the board netlist. BAT− is upstream net N$1 through protection, not system GND.
