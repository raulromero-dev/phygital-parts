# Seeed Grove SCD41 reference geometry

Retrieved 2026-11-14 from the [Seeed SCD41 documentation](https://wiki.seeedstudio.com/Grove-CO2_&_Temperature_&_Humidity_Sensor-SCD41/):

- [Sensirion SCD4x STEP](https://files.seeedstudio.com/wiki/Grove-CO2%26Temperature%26HumiditySensor-SCD4/res/Sensirion_CO2_Sensors_SCD4x_STEP_file.step), retained unmodified as `scd4x.step`.
- [Seeed board archive](https://files.seeedstudio.com/wiki/Grove-CO2%26Temperature%26HumiditySensor-SCD4/res/SCH%26PCB.zip), unmodified v1.01 Eagle board and schematic extracted as `scd41.brd` and `scd41.sch`.
- [Product / purchase page](https://www.seeedstudio.com/Grove-CO2-Temperature-Humidity-Sensor-SCD41-p-5025.html).

Manufacturer files remain attributed to Seeed / Sensirion under their original terms. The Eagle board carries its Creative Commons / OSHW notices; no additional rights are asserted over vendor CAD.

The planning GLB reuses the SCD4x sensor mesh and the Eagle `BORDER_1U-DIM-W/-DRILL` outline (20 × 24.2 mm including tabs). The Grove connector body and component heights are approximations. A 14 mm overall height is a planning allowance. J1 nets come directly from the board: 1 SCL, 2 SDA, 3 VCC, 4 GND. The chip package is labeled SCD40-D-R2 in the manufacturer's SCD41 board; the vendor SCD4x family CAD is reused as supplied.

Regenerate:

```sh
node blender/convert-cad.cjs scd4x
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/air-monitor.py
```

The example proposes 3.3 V operation within Seeed's 2.4–5 V range and I²C address 0x62. The carrier regulator's peak-current capacity, temperature compensation, ventilation and firmware still need review. No stock, pricing, calibrated performance or finished device is promised.
