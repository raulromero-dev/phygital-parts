// Seeed Round Display v1.1: published Eagle board + hardware usage guide.
// Component heights and the final wearable enclosure remain planning estimates.
export const WATCH_SOURCES={
 display:'https://www.seeedstudio.com/1-28-Round-Touch-Display-for-Seeed-Studio-XIAO-ESP32.html',
 controller:'https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html',
 guide:'https://wiki.seeedstudio.com/seeedstudio_round_display_usage/',
 hardware:'https://wiki.seeedstudio.com/get_start_round_display/',
 firmware:'https://github.com/Seeed-Studio/Seeed_Arduino_RoundDisplay',
 case:'https://files.seeedstudio.com/wiki/round_display_for_xiao/Round-Display-shell-3D-Model.stl',
 battery:'https://www.lithium-polymer-battery.net/iec62133-certified-lpr553535-3-7v-600mah-2-22wh-round-lithium-polymer-battery-with-pcm-wires-jst-phr-2/',
 batteryDrawing:'https://www.lithium-polymer-battery.net/wp-content/uploads/2024/02/LPR553535-600mAh.pdf'
};
export const WATCH_SIGNALS=[
 ['d0','Battery measurement · switchable','analog',0,7],
 ['d1','LCD chip select','gpio',0,6],
 ['d2','microSD chip select','gpio',0,5],
 ['d3','LCD data / command','gpio',0,4],
 ['d4','Touch + RTC SDA','sda',0,3],
 ['d5','Touch + RTC SCL','scl',0,2],
 ['d6','Backlight · switchable','gpio',0,1],
 ['5v','USB 5V','power',1,1],
 ['gnd','Ground','ground',1,2],
 ['3v3','XIAO 3V3','power',1,3],
 ['d10','LCD + microSD MOSI','gpio',1,4],
 ['d9','microSD MISO','gpio',1,5],
 ['d8','LCD + microSD clock','gpio',1,6],
 ['d7','Touch interrupt','gpio',1,7]
];
export const WATCH_PORTS={
 'watch-display':[
  ...WATCH_SIGNALS.map(([id,label,signal,side,pin])=>({id,label:`${id.toUpperCase()} · ${label}`,signal,rail:id==='5v'?'5':id==='gnd'?'0':'3.3',group:`${side?'J4':'J5'} socket · contact ${pin}`,anchor:[(side?-7.62:7.62)/21.5,-1,(-9.652+(side?pin-4:4-pin)*2.54)/21.5]})),
  {id:'bat+',label:'J1 / 1 · VBAT',signal:'power',rail:'cell',group:'Battery · JST 1.25 per Seeed',anchor:[0,-.4,-.92]},
  {id:'bat-',label:'J1 / 2 · GND',signal:'ground',rail:'0',group:'Battery · JST 1.25 per Seeed',anchor:[.06,-.4,-.92]}
 ],
 'watch-battery':[
  {id:'positive',label:'Pack + · meter polarity',signal:'power',rail:'cell',group:'JST-PH 2.0 · needs adapter',anchor:[.25,0,-1]},
  {id:'negative',label:'Pack − · meter polarity',signal:'ground',rail:'0',group:'JST-PH 2.0 · needs adapter',anchor:[-.25,0,-1]}
 ],
 'watch-round-battery':[
  {id:'positive',label:'Pack + · meter polarity',signal:'power',rail:'cell',group:'JST-PHR-2 · needs adapter',anchor:[.18,0,-1]},
  {id:'negative',label:'Pack − · meter polarity',signal:'ground',rail:'0',group:'JST-PHR-2 · needs adapter',anchor:[-.18,0,-1]}
 ],
 'watch-antenna':[{id:'rf',label:'Included antenna · U.FL',signal:'rf',group:'Coax lead · measure length',anchor:[-1,0,0]}]
};
const base={owned:false,integrated:false,quantity:1,sources:[],photo:'Smartwatch starter · manufacturer references',tags:['Smartwatch'],category:'Candidate'};
export const WATCH_PARTS=[
 {...base,id:'watch-display',name:'Seeed Round Display for XIAO',short:'Round touchscreen',kind:'screen',color:'#26383c',dimensions:[43,10,43],confidence:'partial',
  interface:'1.28″ touch · 240 × 240 · XIAO 2 × 7 headers',
  summary:'Round touchscreen with RTC, microSD slot and LiPo charging. Published board files and open-source Arduino examples.',
  dimensionNote:'43 mm board envelope from Seeed product specification; 39 mm glass from the wiki. 10 mm thickness is estimated. Measure the assembled stack.',
  modelNote:'PCB outline, footprint positions and header nets reused from Seeed v1.1 Eagle. Glass, component bodies and heights are approximate. The clock face is illustrative.',
  placement:'Display faces out; XIAO plugs into the rear sockets. Keep its USB port reachable. Use Explode to inspect the stack.',
  electrical:'D1/D3/D8/D10 drive LCD; D4/D5 serve touch + RTC; D7 is touch interrupt; D2/D9 serve microSD. D0/D6 are switchable. Battery socket is JST 1.25, not JST-PH 2.0; charging is approximately 485 mA. Leave XIAO BAT pads unused.',
  purchaseLinks:[['Buy at Seeed',WATCH_SOURCES.display]],links:[['Hardware & schematics',WATCH_SOURCES.hardware],['Pin map',WATCH_SOURCES.guide],['Open-source firmware',WATCH_SOURCES.firmware],['Manufacturer case STL',WATCH_SOURCES.case]]},
 {...base,id:'watch-battery',modelId:'battery',name:'Adafruit 500 mAh LiPo · PID 1578',short:'500 mAh LiPo',kind:'battery',color:'#d8bd69',dimensions:[29,4.75,36],confidence:'partial',
  interface:'3.7 V · protected · JST-PH 2.0',summary:'Battery candidate for the watch. Included for fit planning; deliberately not wired until a mating adapter is selected.',
  dimensionNote:'29 × 36 × 4.75 mm and 102 mm lead per Adafruit. Reserve extra space for the lead, pouch and adapter.',
  modelNote:'Existing battery visualization resized to the vendor envelope; not exact PID 1578 CAD.',
  placement:'Below the electronics, with insulation and pouch clearance. The 102 mm lead needs routing space.',
  electrical:'Adafruit permits charging at 500 mA or less. Verify actual Round Display current, polarity and a PH2.0-to-1.25 mm adapter before connecting. No direct plug fit is implied.',
  purchaseLinks:[['Buy at Adafruit','https://www.adafruit.com/product/1578']],links:[['Battery specifications','https://www.adafruit.com/product/1578']]},
 {...base,id:'watch-round-battery',name:'LiPol LPR553535 · round 600 mAh LiPo',short:'Round 600 mAh LiPo',kind:'battery',color:'#c9b469',dimensions:[35,5.5,32],confidence:'partial',
  interface:'3.7 V · PCM protection · JST PHR-2',
  summary:'Round watch battery candidate. Request stock and sample pricing from LiPol; the supplier lists a five-piece minimum for stocked cells.',
  dimensionNote:'Manufacturer drawing: Ø35 mm, 32 mm across the flattened side, 5.5 mm maximum thickness. 50 ± 3 mm lead and plug need separate routing clearance.',
  modelNote:'Blender planning model based on the manufacturer drawing. Foil, seam and protection-board details are approximate; not manufacturer CAD.',
  placement:'Centred below the watch electronics. Keep the flat lead edge accessible and leave insulation and pouch clearance.',
  electrical:'HOLD: datasheet maximum charge current is 300 mA (standard 120 mA); the Round Display lists approximately 485 mA. Reduce and verify the charger current or select a suitable charging path before connecting. PHR-2 also needs a verified adapter to the 1.25 mm socket.',
  purchaseLinks:[['LiPol · request samples / quote',WATCH_SOURCES.battery]],links:[['Manufacturer drawing & charge limits',WATCH_SOURCES.batteryDrawing]]},
 {...base,id:'watch-antenna',modelId:'strip',name:'XIAO ESP32-S3 included antenna',short:'Included antenna',kind:'strip',color:'#aa7945',dimensions:[45,1,10],confidence:'estimate',
  interface:'2.4 GHz · U.FL coax',summary:'The XIAO product includes an antenna. This reserved envelope needs measurement against the shipped version.',
  dimensionNote:'45 × 10 × 1 mm is a planning allowance, not a vendor dimension. Measure antenna and lead.',
  modelNote:'Reuses the existing flexible antenna planning model; exact included-antenna geometry is unverified.',
  placement:'Along a nonmetal case edge. Check clearance to battery, PCB and wrist before finalizing the case.',
  electrical:'Attach the included antenna to XIAO U.FL. Do not add the large RP-SMA adapter to this connection.',
  purchaseLinks:[['Included with XIAO',WATCH_SOURCES.controller]],links:[['Seeed parts list',WATCH_SOURCES.controller]]}
];
