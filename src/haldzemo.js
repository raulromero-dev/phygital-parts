// Exact seller SKU. Dimensions/pin labels are listing evidence, not vendor CAD.
export const HALDZEMO_ID='lcd-haldzemo-28';
export const JUMPER_MF='2.54 mm female → male jumper';
export const HALDZEMO={
 id:HALDZEMO_ID,name:'Haldzemo 2.8″ IPS capacitive LCD · B0G8Z6NS9B',short:'Haldzemo 2.8″ LCD',
 category:'Candidate',kind:'screen',color:'#202724',owned:false,integrated:false,quantity:1,sources:[],
 dimensions:[50,14.28,86],confidence:'listing',interface:'240 × 320 · ILI9341V SPI + FT6336G I²C touch',
 summary:'Standalone screen with an installed 14-pin male header. Individual female-to-male jumpers connect it to the XIAO carrier. No ESP32 is included.',
 dimensionNote:'Seller envelope: 50 × 86 × 14.28 mm including rear pins. Glass 50 × 69.20 mm, active area 43.60 × 58.05 mm. Female housings and bends need extra space; measure the delivered revision.',
 modelNote:'Blender reconstruction from exact-SKU front/rear seller photos. Envelope and 2.54 mm pitch follow the listing; component positions, heights, hole centres and connector bodies are approximations. No matching manufacturer CAD was located.',
 placement:'Rear male pins project down from the short PCB edge. Reserve about 10 mm below the header base for the female housing and more space for the wire bend. Keep the carrier outer female sockets accessible.',
 electrical:'Proposed 3.3 V supply and logic; seller permits 3.3 V with reduced brightness and recommends 5 V for full brightness. Do not connect LiPo directly. Verify total current before powering. Disable/remove microSD on both boards; keep UART unused. Touch shares I²C with the camera and hub; confirm addresses, pull-ups and firmware.',
 photo:'Amazon exact SKU B0G8Z6NS9B · pin table, dimensional and rear product images checked November 16, 2026',
 tags:['SPI display','Capacitive touch','Installed male header'],
 links:[['Amazon · exact Haldzemo screen','https://www.amazon.com/dp/B0G8Z6NS9B'],['Amazon · 10 cm jumper assortment (choose female-to-male)','https://www.amazon.com/dp/B0BTT31CBC']],
 purchaseLinks:[['Amazon · Haldzemo 2.8″ LCD','https://www.amazon.com/dp/B0G8Z6NS9B']]
};
const pinSpecs=[
 ['vcc','VCC · 3.3 V dim mode','power','3.3'],['gnd','GND','ground','0'],
 ['cs','LCD_CS','gpio','3.3'],['rst','LCD_RST','gpio','3.3'],['dc','LCD_RS / DC','gpio','3.3'],
 ['mosi','SDI / MOSI','gpio','3.3'],['sclk','SCK','gpio','3.3'],['led','LED · optional','gpio','3.3'],
 ['miso','SDO / MISO · unused','gpio','3.3'],['tp-scl','CTP_SCL','scl','3.3'],
 ['tp-rst','CTP_RST','gpio','3.3'],['tp-sda','CTP_SDA','sda','3.3'],['tp-int','CTP_INT','gpio','3.3'],['sd-cs','SD_CS · unused','gpio','3.3']
];
// Pin 1 is rightmost when looking at the rear with the header at the bottom.
// Front-facing local +X is the opposite of the photographed rear-view +X.
export const HALDZEMO_PORTS=pinSpecs.map(([id,label,signal,rail],n)=>({id,label:`${n+1} · ${label}`,signal,rail,group:'Rear P3 · 2.54 mm male header',anchor:[(n-6.5)*2.54/25,-1.5/7.14,40.6/43]}));
export const HALDZEMO_INTERNALS=[
 {name:'Display + touch',route:'ILI9341V receives SPI pixels; FT6336G uses separate I²C data, clock, reset and interrupt. Both controllers are already on the display board. The XIAO remains the processor.',evidence:'Exact-SKU seller pin table and rear photo'},
 {name:'11 individual jumper leads',route:'Female 2.54 mm housings fit over the rear male pins; male ends insert into the carrier’s exposed female contacts. LED, SDO/MISO and SD_CS are left open. The included FPC cable is not used and jumper wires are purchased separately.',evidence:'Seller product contents and interface table; wiring is a proposed assignment'},
 {name:'Power + shared pins',route:HALDZEMO.electrical,evidence:'Seller permits reduced-brightness 3.3 V operation; Seeed carrier netlist'},
];
export const HALDZEMO_PIN_MAP=[['vcc','3v3'],['gnd','gnd'],['cs','d0'],['rst','d6'],['dc','d2'],['mosi','d10'],['sclk','d8'],['tp-scl','d5'],['tp-rst','d7'],['tp-sda','d4'],['tp-int','d9']];
export function haldzemoJumpers(displayId,carrierId){
 return HALDZEMO_PIN_MAP.map(([pin,header],n)=>({
  id:`${displayId}-${pin}`,from:`${displayId}:${pin}`,to:`${carrierId}:h-${header}`,type:JUMPER_MF,
  bundle:'Haldzemo · female-to-male jumpers',length:100,
  color:pin==='vcc'?'#c23c32':pin==='gnd'?'#303030':['#b49b42','#e3e0cf','#367996','#7a6a9a'][n%4],status:'Planned',
  note:'Individual 2.54 mm female end → screen rear male pin; male end → carrier outer female socket. 100 mm nominal wire length, housings additional; measure the routed path. Colors are illustrative, not pin identification. 3.3 V reduced-brightness supply needs a current-budget check. Disable/remove both microSD cards and keep UART unused. LED, MISO and SD_CS stay open; touch needs separate FT6336G firmware. Verify delivered labels and continuity.'
 }));
}

// Conservative solid regions from blender/haldzemo.py. The pins project only
// at the rear edge; the remaining space below the PCB can accept other boards.
// These are photo-model estimates, not a certified collision mesh.
export const HALDZEMO_FIT_REGIONS = [
 {position:[0,2.695,0],dimensions:[50,8.89,86]},
 {position:[0,-4.445,40.6],dimensions:[35.56,5.39,2.5]}
];
