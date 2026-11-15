export const CYBERDECK_SOURCES={
 guide:'https://docs.m5stack.com/en/core/Cardputer-Adv',
 store:'https://shop.m5stack.com/products/m5stack-cardputer-adv-version-esp32-s3',
 cad:'https://github.com/m5stack/M5_Hardware/tree/f66b64a1ee5502887d28921f654b24b3b36e9721/Products/K132-Adv_Cardputer-Adv/Structures',
 firmware:'https://github.com/m5stack/M5Cardputer',
 source:'https://phygitalstudio.app/reference/makeup-cyberdeck/source.zip'
};
const common={owned:false,quantity:1,category:'Candidate',sources:[],tags:['Makeup cyberdeck'],photo:'Manufacturer reference + original Blender case concept'};
export const CYBERDECK_PARTS=[
 {...common,id:'cardputer-adv',name:'M5Stack Cardputer-Adv',short:'Cardputer-Adv',kind:'board',color:'#d0cec4',dimensions:[84.1,19.7,54],confidence:'manufacturer',
  interface:'ESP32-S3 · keyboard · 1.14″ display · 1500 mAh',
  dimensionNote:'M5Stack lists 84 × 54 × 19.6 mm; this envelope rounds the original CAD outward to 84.1 × 54 × 19.7 mm. Measure the purchased revision.',
  modelNote:'Original M5Stack MIT STL, assembled unit only. Detached duplicate pieces excluded. Colors and key/screen legends are presentation additions.',
  summary:'An integrated handheld computer; its keyboard, display and battery are already connected.',
  placement:'Keep USB-C, Grove, power switch, headphone and microSD access open. The surrounding compact is a removable cradle concept.',
  electrical:'Use the built-in charging system and a suitable USB-C cable. No separate display cable or additional cell is needed. Grove supplies 5 V; GPIOs use 3.3 V logic. Review any added accessory.',
  purchaseLinks:[['M5Stack · Cardputer-Adv',CYBERDECK_SOURCES.store]],links:[['Manufacturer guide',CYBERDECK_SOURCES.guide],['Original CAD · MIT',CYBERDECK_SOURCES.cad],['Open-source library',CYBERDECK_SOURCES.firmware]]},
 ...[
  ['compact-base','Compact base',[98,24,69],'#b77589','Open cradle · custom part'],
  ['compact-lid','Mirrored lid frame',[98,4.8,68],'#b77589','Clamshell lid · custom part'],
  ['compact-mirror','Mirror insert',[86,1,56],'#aebfc5','Cut-to-size mirror · material unselected'],
  ['compact-hinge','Hinge concept',[83,4,4],'#b58a6d','Hinge allowance · hardware unselected']
 ].map(([id,name,dimensions,color,interfaceText])=>({...common,id,name,short:name,kind:'other',color,dimensions,confidence:'estimate',interface:interfaceText,
  dimensionNote:'Concept dimensions, not a measured retail compact. Allow mounting, closure, material and cable-access tolerances.',modelNote:'Original Blender planning geometry; not fabrication-ready.',
  summary:'Makeup-compact styling for the Cardputer. This mechanical part still needs detailed design.',placement:'The example is shown open. Validate both the closed fit and hinge sweep in CAD; dragging parts does not simulate a hinge.',electrical:'No electrical contacts. Keep reflective coatings and metal hinge hardware clear of circuits and antenna.',
  procurementLabel:id==='compact-mirror'?'Specify material':id==='compact-hinge'?'Specify hardware':'Design this part',procurementLinks:[['Concept source files',CYBERDECK_SOURCES.source]],links:[['Blender source & attribution',CYBERDECK_SOURCES.source]]}))
];
export const CARDPUTER_PORTS=[
 {id:'usb',label:'USB-C · charge / data',signal:'usb',rail:null,group:'USB-C · approximate position',anchor:[1,0,-.6]},
 ...[['gnd','Black · GND','ground','0'],['5v','Red · 5V','power','5'],['g2','Yellow · GPIO2','gpio','3.3'],['g1','White · GPIO1','gpio','3.3']].map(([id,label,signal,rail],i)=>({id,label,signal,rail,group:'HY2.0-4P Grove · verify orientation',anchor:[-1,-.2,-.1+i*.08]}))
];
export const CARDPUTER_INTERNALS=[
 {name:'Display · built in',route:'ST7789V2: backlight G38, reset G33, DC G34, data G35, clock G36, CS G37. Internal connection; no external harness.',evidence:'M5Stack Cardputer-Adv pin map'},
 {name:'Keyboard · built in',route:'56-key matrix via TCA8418: SDA G8, SCL G9, interrupt G11. Already assembled.',evidence:'M5Stack Cardputer-Adv pin map'},
 {name:'Battery and charging · built in',route:'1500 mAh battery with onboard charging. Battery monitor uses G10. Use USB-C; do not add an external charger to the cell.',evidence:'M5Stack current product guide'},
 {name:'Expansion',route:'Grove: black GND, red 5 V, yellow G2, white G1. The separate 14-pin EXT header is documented by the vendor but is not mapped here.',evidence:'M5Stack Cardputer-Adv pin map'}
];
