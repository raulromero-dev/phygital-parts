// Original project-specific inventory and evidence, kept apart from generic starters.
export const PHYGITAL_REFERENCE={
  "expansion": {
    "summary": "The carrier for the current prototype. OLED, thumb button, buzzer, RTC and microSD are integrated.",
    "placement": "Keep the OLED visible, D1 button reachable and USB-C accessible. Ports and underside parts need clearance.",
    "electrical": "Seeed specifies 5 V / 3.7 V LiPo operation and up to 460 mA charging. Verify your board revision and battery polarity.",
    "owned": true,
    "quantity": 1,
    "photo": "10.13.39 AM · XIAO starter kit",
    "tags": [
      "Carrier",
      "Display",
      "Power"
    ],
    "sources": [
      "hardware",
      "expansion"
    ]
  },
  "xiao": {
    "summary": "Arduino-programmed controller for passive 2.4 GHz Wi-Fi, Bluetooth and the thermal sensor.",
    "placement": "Mounted in the carrier headers. The assembly keeps this board attached when the carrier moves.",
    "electrical": "ESP32-S3 is 2.4 GHz only. A dual-band antenna does not add 5 GHz reception. GPIOs are not a battery input.",
    "owned": true,
    "quantity": 1,
    "photo": "Identified in repository; not separately pictured",
    "tags": [
      "Controller",
      "2.4 GHz",
      "BLE"
    ],
    "sources": [
      "hardware",
      "xiao"
    ]
  },
  "thermal": {
    "summary": "WatangTech 32 × 24 thermal array, D55 listing. Warm spots are leads to investigate, not proof of a camera.",
    "placement": "Aim through an open aperture. Ordinary glass and most plastics block long-wave IR. Separate from warm electronics.",
    "electrical": "Bare MLX90640 uses 3.3 V. Verify the breakout regulator and I²C pull-up rail before connecting a Grove supply.",
    "owned": true,
    "quantity": 1,
    "photo": "10.14.06 AM · WatangTech MLX90640-D55",
    "price": 66.3,
    "tags": [
      "Thermal",
      "I²C",
      "55° listing"
    ],
    "sources": [
      "hardware",
      "thermal"
    ]
  },
  "battery": {
    "summary": "AKZYTUE protected 1-cell pack from the screenshot. Included in this layout; electrical installation is unconfirmed.",
    "placement": "Leave room for the pouch, strain relief and insulation. Do not compress or puncture the cell with screws or PCB pins.",
    "electrical": "Confirm polarity with a meter and select one documented charging path. Do not feed the raw cell into a 3.3 V GPIO or rail.",
    "owned": true,
    "quantity": 1,
    "photo": "10.14.48 AM · AKZYTUE 3.7 V 2500 mAh 505573",
    "price": 11.99,
    "tags": [
      "Power",
      "Polarity check"
    ],
    "sources": [
      "hardware",
      "expansion",
      "xiao"
    ]
  },
  "rod": {
    "summary": "QUEENTI dual-band antennas, advertised 8 dBi, with two 15 cm pigtails. Current bench reference per repository.",
    "placement": "Large external envelope. Paddle, hinge and threaded base are photo-based estimates; the cable route is illustrative. Check SMA versus RP-SMA centre contact before mating.",
    "electrical": "Only 2.4 GHz is used by ESP32-S3. Repository RSSI thresholds were measured with this style of antenna.",
    "owned": true,
    "quantity": 2,
    "photo": "10.14.17 AM · 2 × QUEENTI antenna kit",
    "price": 8.99,
    "tags": [
      "Current antenna",
      "2-pack"
    ],
    "sources": [
      "hardware",
      "xiao"
    ]
  },
  "strip": {
    "summary": "Replacement concept for the external antenna. No exact strip product was supplied; purchase is on hold.",
    "placement": "Reserve an edge of the plastic enclosure away from the battery, PCB ground and the grip. Clearance here is a planning heuristic.",
    "electrical": "Match antenna band, impedance and connector variant. Re-run RSSI calibration after changing the antenna.",
    "owned": false,
    "quantity": 1,
    "photo": "Requested replacement · no screenshot",
    "tags": [
      "Replacement",
      "SKU needed"
    ],
    "sources": [
      "hardware",
      "xiao"
    ]
  },
  "rf": {
    "summary": "YWBL-WH / NWDZ V1.0 module from the screenshot. Can indicate RF energy; cannot identify a cellular tracker by itself.",
    "placement": "Reserve RF connectors, LTE antenna/filter and distance from the ESP32 antenna. The current firmware does not integrate it.",
    "electrical": "AD8317 IC: 3.0–5.5 V supply; exact seller board unverified. Measure output range and protect ADC; use an available ADC1 pin after pin audit.",
    "owned": true,
    "quantity": 1,
    "photo": "10.15.02 AM · AD8317 EVAL BD NWDZ V1.0",
    "price": 23.02,
    "tags": [
      "Analog",
      "Not integrated"
    ],
    "sources": [
      "hardware",
      "rf"
    ]
  },
  "motor": {
    "summary": "tatoko 3 V, 12,000 rpm coin motors, pack of 20. One motor gives discreet tactile feedback.",
    "placement": "Couple to the enclosure/hand and isolate the thermal sensor from vibration. Reserve the wire bend.",
    "electrical": "Never drive a motor directly from an ESP32 GPIO. Use a suitable driver or transistor circuit, rail and suppression; verify stall current.",
    "owned": true,
    "quantity": 20,
    "photo": "10.13.58 AM · tatoko coin motors",
    "price": 13.99,
    "tags": [
      "Haptics",
      "20-pack"
    ],
    "sources": [
      "hardware"
    ]
  },
  "jst": {
    "summary": "Dirvcp male/female pigtail assortment. Useful for a removable battery connection; mating connector alone does not establish polarity.",
    "placement": "Keep room for latch access, strain relief and cable bends.",
    "electrical": "Verify both ends with a multimeter: JST-PH cable polarity varies between vendors. No automatic electrical connection is implied.",
    "owned": true,
    "quantity": 20,
    "photo": "10.13.51 AM · Dirvcp 20-pack",
    "price": 6.99,
    "tags": [
      "Wiring",
      "20-pack"
    ],
    "sources": []
  },
  "headers": {
    "summary": "DIKAVS male header strips, pack of 10. Consumables for mounting and prototyping.",
    "placement": "Use only the required segment. Pins need solder-side clearance and must not contact the battery pouch.",
    "electrical": "Confirm pin pitch, pin length and female socket engagement before soldering.",
    "owned": true,
    "quantity": 10,
    "photo": "10.15.13 AM · DIKAVS breakaway headers",
    "price": 7.39,
    "tags": [
      "Mounting",
      "10-pack"
    ],
    "sources": []
  },
  "driver": {
    "summary": "Candidate driver for the coin motor. The separate sensor-node firmware supports it; Phygital.ino needs integration.",
    "placement": "Place near the motor; keep I²C and motor wires short. Shares I²C with thermal at a different address.",
    "electrical": "Confirm the selected breakout supply, ERM configuration and motor rated/stall current. Adding this model does not complete wiring or firmware.",
    "owned": false,
    "quantity": 1,
    "photo": "Repository candidate · ownership unconfirmed",
    "tags": [
      "Haptics",
      "To source"
    ],
    "sources": [
      "hardware",
      "haptic"
    ]
  },
  "charger": {
    "summary": "Dedicated charging option from project notes. Evaluate whether the existing carrier charger meets the actual charging target first.",
    "placement": "Keep USB reachable and charging heat away from the thermal sensor and battery.",
    "electrical": "Choose one designed charging path. Do not parallel this charger with the carrier/XIAO charger; verify system/load wiring and current limit.",
    "owned": false,
    "quantity": 1,
    "photo": "Repository plan · no screenshot",
    "tags": [
      "Power",
      "To source"
    ],
    "sources": [
      "hardware",
      "charger"
    ]
  },
  "kit": {
    "summary": "The screenshot lists an expansion board, nine Grove modules and accessories. Exact module identities and quantities remain to be inventoried.",
    "placement": "Bench inventory only. Add a measured custom component for an individual module.",
    "electrical": "Check each module voltage, interface and current draw. The kit listing does not prove any particular XIAO MCU is included.",
    "owned": true,
    "quantity": 1,
    "photo": "10.13.39 AM · Seeed Studio XIAO Starter Kit",
    "price": 59.99,
    "tags": [
      "Bench only",
      "Avoid double count"
    ],
    "sources": [
      "expansion"
    ]
  },
  "grove": {
    "summary": "Multiple Grove-style cable assemblies visible in the new bench photo. Stock count and continuity unverified.",
    "placement": "Reserve a bend radius and latch access; cable is flexible, proxy represents one connector.",
    "electrical": "Map SDA, SCL, VCC and GND by continuity and silkscreen. Wire colors are not proof of function.",
    "owned": true,
    "quantity": 1,
    "photo": "10.38.10 AM · bench photo",
    "tags": [
      "Cable",
      "Count pending"
    ],
    "sources": [
      "expansion"
    ]
  },
  "grove-tail": {
    "summary": "Cut or stripped cable ends visible in the bench photo. Useful for adapting a module after tracing every conductor.",
    "placement": "Insulate exposed conductors and add strain relief after soldering.",
    "electrical": "Meter continuity from connector contacts to each loose end. Physical pin order is unverified.",
    "owned": true,
    "quantity": 1,
    "photo": "10.38.10 AM · bench photo",
    "tags": [
      "Cable",
      "Exposed ends"
    ],
    "sources": []
  },
  "jumper": {
    "summary": "Orange jumper leads visible in the bench photo, with exposed male pins on several ends. Count and all end types need inspection.",
    "placement": "For prototyping; provide retention and avoid loose exposed pins near the battery.",
    "electrical": "Each lead is a conductor, not a voltage converter. Verify continuity and socket fit.",
    "owned": true,
    "quantity": 1,
    "photo": "10.38.10 AM · bench photo",
    "tags": [
      "Cable",
      "Count pending"
    ],
    "sources": []
  },
  "crowpanel-advance-28": {
    "summary": "A complete display and controller, with an ESP32-S3-WROOM-1, 2.8″ capacitive touchscreen and built-in PCB Wi-Fi/Bluetooth antenna. No haptic motor is included.",
    "placement": "Starts beside the current build for comparison. Rotate 90° around Y to compare its portrait footprint with the battery. Keep rear sockets, buttons and USB ports accessible.",
    "electrical": "I²C J7: 1 SCL/GPIO16, 2 SDA/GPIO15, 3 3.3 V, 4 GND. HY2.0-4P connector; verify mating housing and cable continuity. Phygital needs a firmware port and a reviewed power budget. The XIAO antenna strip cannot attach to this PCB-antenna module.",
    "owned": false,
    "quantity": 1,
    "photo": "Elecrow product, v1.2 Eagle schematic/PCB and official STEP assembly · checked November 14, 2026",
    "tags": [
      "Integrated controller",
      "No built-in haptics",
      "To source"
    ],
    "sources": []
  },
  "lcd-27579": {
    "summary": "Closest battery-size option. Included GH1.25 13-pin cable has female jumper ends. Use eight 2.54 mm male-to-male jumpers to the spare carrier sockets for display-only wiring. Touch contacts remain available for manual planning; V1 CST328 and V2 CST3530 need different software.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Use 3.3 V power and logic together. Proposed SPI assignments require microSD disabled/card removed and UART unused. Verify supply capacity. Touch is not auto-wired; MISO is unavailable.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "lcd-18366": {
    "summary": "Slightly smaller battery-size alternative. Manufacturer includes a PH2.0 8-pin 20 cm cable. Match its jumper ends to the exposed carrier headers.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3 V supply and logic in this plan. Eight display conductors; microSD disabled/card removed and UART unused. Check current and cable-end gender.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "oled-938": {
    "summary": "Larger display with installed plug-in sockets. Its default 0x3D address can share the bus with the onboard 0x3C display and 0x33 thermal camera.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3 V I²C; review address, connector revision and software before wiring.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "oled-326": {
    "summary": "Smaller comparison option. Same solderless Grove-to-QT cable as the 1.3″ board; current QT revision required.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3 V I²C; review address, connector revision and software before wiring.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "oled-az": {
    "summary": "Amazon alternative with a larger display. Header assembly, pin order and address must be confirmed. A 0x3C unit would conflict with the carrier OLED on this bus.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3 V I²C; review address, connector revision and software before wiring.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "oled-uctronics": {
    "summary": "Budget comparison option. Manufacturer lists GND, VCC, SCL and SDA. Confirm installed header and I²C address; 0x3C conflicts with the onboard OLED.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3 V I²C; review address, connector revision and software before wiring.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "grove-haptic-1": {
    "summary": "Complete motor-and-driver module with an installed Grove socket. Plug a standard four-wire Grove cable into the multiplexer; no loose motor leads or soldering.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3–5 V, 100 kHz I²C, fixed 0x5A, maximum 750 mW per manufacturer. Four modules require separate multiplexer channels and a reviewed supply budget.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "grove-haptic-2": {
    "summary": "Complete motor-and-driver module with an installed Grove socket. Plug a standard four-wire Grove cable into the multiplexer; no loose motor leads or soldering.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3–5 V, 100 kHz I²C, fixed 0x5A, maximum 750 mW per manufacturer. Four modules require separate multiplexer channels and a reviewed supply budget.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "grove-haptic-3": {
    "summary": "Complete motor-and-driver module with an installed Grove socket. Plug a standard four-wire Grove cable into the multiplexer; no loose motor leads or soldering.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3–5 V, 100 kHz I²C, fixed 0x5A, maximum 750 mW per manufacturer. Four modules require separate multiplexer channels and a reviewed supply budget.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "grove-haptic-4": {
    "summary": "Complete motor-and-driver module with an installed Grove socket. Plug a standard four-wire Grove cable into the multiplexer; no loose motor leads or soldering.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "3.3–5 V, 100 kHz I²C, fixed 0x5A, maximum 750 mW per manufacturer. Four modules require separate multiplexer channels and a reviewed supply budget.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "haptic-hub": {
    "summary": "One upstream Grove cable from the carrier, then four Grove cables on CH0–CH3 to independently address the four 0x5A haptic modules.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Use 3.3 V with this carrier. TCA9548A switches SDA/SCL, not motor power. Enable one motor channel at a time. Four modules can demand 3 W combined; the carrier rail has not been approved for this load.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "mosfet-1": {
    "summary": "Preassembled MOSFET switch with flyback diode. Separate signal input gives independent on/off or PWM motor control.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "SIG is 3.3 V logic. V+ must be a motor-rated supply: target 3.0 V for the owned motors. Measure stall current and verify terminal grip.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "mosfet-2": {
    "summary": "Preassembled MOSFET switch with flyback diode. Separate signal input gives independent on/off or PWM motor control.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "SIG is 3.3 V logic. V+ must be a motor-rated supply: target 3.0 V for the owned motors. Measure stall current and verify terminal grip.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "mosfet-3": {
    "summary": "Preassembled MOSFET switch with flyback diode. Separate signal input gives independent on/off or PWM motor control.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "SIG is 3.3 V logic. V+ must be a motor-rated supply: target 3.0 V for the owned motors. Measure stall current and verify terminal grip.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "mosfet-4": {
    "summary": "Preassembled MOSFET switch with flyback diode. Separate signal input gives independent on/off or PWM motor control.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "SIG is 3.3 V logic. V+ must be a motor-rated supply: target 3.0 V for the owned motors. Measure stall current and verify terminal grip.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "motor-2": {
    "summary": "One additional motor from your existing tatoko pack. Stock count remains to be checked.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Connect only to a driver output. Rated/stall current of this exact motor is unknown.",
    "owned": true,
    "quantity": 1,
    "photo": "User screenshot · tatoko 20-pack",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "motor-3": {
    "summary": "One additional motor from your existing tatoko pack. Stock count remains to be checked.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Connect only to a driver output. Rated/stall current of this exact motor is unknown.",
    "owned": true,
    "quantity": 1,
    "photo": "User screenshot · tatoko 20-pack",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "motor-4": {
    "summary": "One additional motor from your existing tatoko pack. Stock count remains to be checked.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Connect only to a driver output. Rated/stall current of this exact motor is unknown.",
    "owned": true,
    "quantity": 1,
    "photo": "User screenshot · tatoko 20-pack",
    "tags": [
      "To source"
    ],
    "sources": []
  },
  "motor-rail": {
    "summary": "Missing regulated 3 V supply and solderless distribution for four drivers. No input is connected: this is an incomplete power design.",
    "placement": "Place behind an enclosure opening. Check mounting holes, cable bend and lid clearance.",
    "electrical": "Select a regulator/distributor for the measured combined startup/stall load. Do not use GPIO power or connect the LiPo directly to 3 V motors. Share signal ground.",
    "owned": false,
    "quantity": 1,
    "photo": "Researched November 14, 2026",
    "tags": [
      "To source"
    ],
    "sources": []
  }
};
