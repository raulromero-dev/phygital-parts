import geometry from './crowpanel-ports.json' with { type: 'json' };

// Integrated controller candidate, deliberately separate from external SPI LCDs.
// The fit study never transfers the existing XIAO's cables or firmware silently.
export const CROWPANEL = {
  id: 'crowpanel-advance-28',
  name: 'Elecrow CrowPanel Advance 2.8″ · ESP32-S3',
  short: 'CrowPanel Advance 2.8″',
  category: 'Candidate', kind: 'board', color: '#333333',
  owned: false, integrated: false, quantity: 1, sources: [],
  dimensions: [81, 15.92, 54.37], confidence: 'manufacturer',
  initialPosition: [108, 12, 0],
  interface: '320 × 240 IPS touch + ESP32-S3 · 16 MB flash / 8 MB PSRAM',
  dimensionNote: 'Bare assembly from Elecrow CAD; optional acrylic housing excluded. PCB is 81 × 54 mm. Connector plugs and cable bends require additional clearance.',
  modelNote: 'Manufacturer CAD converted through Blender. Optional acrylic housing removed. Small component bodies/heights and contact docking points are illustrative; see model provenance.',
  summary: 'A complete display and controller, with an ESP32-S3-WROOM-1, 2.8″ capacitive touchscreen and built-in PCB Wi-Fi/Bluetooth antenna. No haptic motor is included.',
  placement: 'Starts beside the current build for comparison. Rotate 90° around Y to compare its portrait footprint with the battery. Keep rear sockets, buttons and USB ports accessible.',
  electrical: 'I²C J7: 1 SCL/GPIO16, 2 SDA/GPIO15, 3 3.3 V, 4 GND. HY2.0-4P connector; verify mating housing and cable continuity. Phygital needs a firmware port and a reviewed power budget. The XIAO antenna strip cannot attach to this PCB-antenna module.',
  photo: 'Elecrow product, v1.2 Eagle schematic/PCB and official STEP assembly · checked November 14, 2026',
  tags: ['Integrated controller', 'No built-in haptics', 'To source'],
  links: [
    ['Elecrow · CrowPanel Advance 2.8″', 'https://www.elecrow.com/crowpanel-advance-2-8-hmi-esp32-ai-display-320x240-artificial-ips-intelligent-touchscreen.html'],
    ['Manufacturer pinout & power guide', 'https://media-cdn.elecrow.com/wiki/CrowPanel_Advance_2.8-HMI_ESP32_AI_Display.html'],
    ['Official CAD & schematics', 'https://github.com/Elecrow-RD/CrowPanel-Advance-2.8-HMI-ESP32-S3-AI-Powered-IPS-Touch-Screen-320x240']
  ]
};

const signals={J7:['scl','sda','power','ground'],J6:['rx','tx','power','ground'],J10:['power','ground'],J5:['rx','tx','power','ground']};
const rail=(socket,signal)=>signal==='ground'?'0':signal==='power'?(socket==='J10'?'cell':socket==='J5'?'5':'3.3'):'3.3';
export const CROWPANEL_PORTS=Object.entries(geometry.ports).flatMap(([socket,connector])=>
 connector.pins.length ? connector.pins.map((pin,i)=>({
  id:socket.toLowerCase()+'-'+pin.number,
  label:`${socket} · ${pin.number} · ${pin.net}`,
  signal:signals[socket][i],group:`${connector.name} · ${connector.connector}`,
  anchor:pin.normalizedAnchor,rail:rail(socket,signals[socket][i])
 })) : [{id:socket.toLowerCase(),label:connector.name,signal:'usb',group:connector.connector,anchor:connector.normalizedCenter,rail:null}]
);
export const CROWPANEL_INTERNALS=[
 {name:'ESP32-S3 + PCB antenna',route:'ESP32-S3-WROOM-1-N16R8 provides the controller, 16 MB flash, 8 MB PSRAM and 2.4 GHz Wi-Fi/BLE antenna. No U.FL socket is mapped; an external strip cannot simply plug into this module.',evidence:'Elecrow product / Eagle v1.2'},
 {name:'2.8″ IPS touchscreen',route:'320 × 240 screen and capacitive touch are already connected on this board. It replaces the display/controller architecture; it is not another eight-wire SPI display for the XIAO.',evidence:'Elecrow product and schematic'},
 {name:'I²C sensor socket · J7',route:'HY2.0-4P: pin 1 SCL GPIO16, 2 SDA GPIO15, 3 3V3_OUT2, 4 GND. Thermal camera and haptics need matched housings, continuity checks, bus initialization and a reviewed supply budget.',evidence:'Elecrow v1.2 netlist / wiki; visual contact anchors approximate'},
 {name:'UART sockets',route:'J6 HY2.0: RX18, TX17, 3.3 V output, GND. J5 XH2.54 (manufacturer name): RX44, TX43, +5 V INPUT, GND. The two power contacts are not interchangeable. Confirm purchased connector pitch and keying.',evidence:'Elecrow v1.2 netlist'},
 {name:'Battery and USB',route:'J10 PH2.0: pin 1 VBAT, pin 2 GND. Review the charging path and polarity for the existing 1S LiPo. J3 USB-C uses CH340K for UART0; J4 is native USB OTG.',evidence:'Elecrow v1.2 schematic'},
 {name:'Haptics remain separate',route:'The onboard buzzer/speaker interface is not a vibration motor. Four independent haptic modules still need their drivers, bus channels, power and firmware.',evidence:'Elecrow parts list / current Phygital haptic study'}
];
