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
 electrical:'User-reported working wiring, November 19: VCC → 5V/VBUS, LCD_RS/DC → D9, CTP_INT disconnected; FT6336G is polled. VBUS needs USB or a verified regulated 5 V source; the LiPo connection alone does not establish a 5 V supply. Never connect the cell directly to VCC. Check touch SDA/SCL pull-up levels at 5 V supply before treating the 3.3 V ESP32 bus as electrically verified. Remove both microSD cards and keep UART unused; verify total current.',
 photo:'Amazon exact SKU B0G8Z6NS9B · pin table, dimensional and rear product images checked November 16, 2026',
 tags:['SPI display','Capacitive touch','Installed male header'],
 links:[['Amazon · exact Haldzemo screen','https://www.amazon.com/dp/B0G8Z6NS9B'],['Amazon · 10 cm jumper assortment (choose female-to-male)','https://www.amazon.com/dp/B0BTT31CBC']],
 purchaseLinks:[['Amazon · Haldzemo 2.8″ LCD','https://www.amazon.com/dp/B0G8Z6NS9B']]
};
const pinSpecs=[
 ['vcc','VCC · 5 V supply','power','5'],['gnd','GND','ground','0'],
 ['cs','LCD_CS','gpio','3.3'],['rst','LCD_RST','gpio','3.3'],['dc','LCD_RS / DC','gpio','3.3'],
 ['mosi','SDI / MOSI','gpio','3.3'],['sclk','SCK','gpio','3.3'],['led','LED · optional','gpio','3.3'],
 ['miso','SDO / MISO · unused','gpio','3.3'],['tp-scl','CTP_SCL','scl','3.3'],
 ['tp-rst','CTP_RST','gpio','3.3'],['tp-sda','CTP_SDA','sda','3.3'],['tp-int','CTP_INT · unused (polled)','gpio','3.3'],['sd-cs','SD_CS · unused','gpio','3.3']
];
// Pin 1 is rightmost when looking at the rear with the header at the bottom.
// Front-facing local +X is the opposite of the photographed rear-view +X.
export const HALDZEMO_PORTS=pinSpecs.map(([id,label,signal,rail],n)=>({id,label:`${n+1} · ${label}`,signal,rail,group:'Rear P3 · 2.54 mm male header',anchor:[(n-6.5)*2.54/25,-1.5/7.14,40.6/43]}));
export const HALDZEMO_INTERNALS=[
 {name:'Display + touch',route:'ILI9341V receives SPI pixels; FT6336G uses I²C data, clock and reset. The working firmware polls touch, leaving CTP_INT open. Both controllers are on the display board. The XIAO remains the processor.',evidence:'Exact-SKU pin table + user-reported working wiring'},
 {name:'10 individual jumper leads',route:'Female 2.54 mm housings fit over the rear male pins; male ends insert into the carrier’s exposed female contacts. LED, SDO/MISO, CTP_INT and SD_CS are left open. The included FPC cable is not used and jumper wires are purchased separately.',evidence:'User-reported physical harness, November 19, 2026'},
 {name:'Power + shared pins',route:HALDZEMO.electrical,evidence:'User-reported 5 V supply; power and I²C levels need separate review'},
];
export const HALDZEMO_PIN_MAP=[['vcc','5v'],['gnd','gnd'],['cs','d0'],['rst','d6'],['dc','d9'],['mosi','d10'],['sclk','d8'],['tp-scl','d5'],['tp-rst','d7'],['tp-sda','d4']];
export function haldzemoJumpers(displayId,carrierId){
 return HALDZEMO_PIN_MAP.map(([pin,header],n)=>({
  id:`${displayId}-${pin}`,from:`${displayId}:${pin}`,to:`${carrierId}:h-${header}`,type:JUMPER_MF,
  bundle:'Haldzemo · female-to-male jumpers',length:100,
  color:pin==='vcc'?'#c23c32':pin==='gnd'?'#303030':['#b49b42','#e3e0cf','#367996','#7a6a9a'][n%4],status:'Planned',
  note:'Individual 2.54 mm female end → screen rear male pin; male end → carrier outer female socket. 100 mm nominal wire length, housings additional; measure the routed path. Colors are illustrative, not pin identification. 5 V/VBUS supply: verify the power source and touch-bus pull-up voltage. D9 carries DC; touch is polled. Disable/remove both microSD cards and keep UART unused. LED, MISO, CTP_INT and SD_CS stay open; touch needs separate FT6336G firmware. Verify delivered labels and continuity.'
 }));
}

// Conservative solid regions from blender/haldzemo.py. The pins project only
// at the rear edge; the remaining space below the PCB can accept other boards.
// These are photo-model estimates, not a certified collision mesh.
export const HALDZEMO_FIT_REGIONS = [
 {position:[0,2.695,0],dimensions:[50,8.89,86]},
 {position:[0,-4.445,40.6],dimensions:[35.56,5.39,2.5]}
];
