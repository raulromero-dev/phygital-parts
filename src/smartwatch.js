// Seeed Round Display v1.1: published Eagle board + hardware usage guide.
// Component heights and the final wearable enclosure remain planning estimates.
export const WATCH_SOURCES={
 display:'https://www.seeedstudio.com/1-28-Round-Touch-Display-for-Seeed-Studio-XIAO-ESP32.html',
 controller:'https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html',
 guide:'https://wiki.seeedstudio.com/seeedstudio_round_display_usage/',
 hardware:'https://wiki.seeedstudio.com/get_start_round_display/',
 firmware:'https://github.com/Seeed-Studio/Seeed_Arduino_RoundDisplay',
 case:'https://files.seeedstudio.com/wiki/round_display_for_xiao/Round-Display-shell-3D-Model.stl',
 battery:'https://www.adafruit.com/product/1578'
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
  purchaseLinks:[['Buy at Adafruit',WATCH_SOURCES.battery]],links:[['Battery specifications',WATCH_SOURCES.battery]]},
 {...base,id:'watch-antenna',modelId:'strip',name:'XIAO ESP32-S3 included antenna',short:'Included antenna',kind:'strip',color:'#aa7945',dimensions:[45,1,10],confidence:'estimate',
  interface:'2.4 GHz · U.FL coax',summary:'The XIAO product includes an antenna. This reserved envelope needs measurement against the shipped version.',
  dimensionNote:'45 × 10 × 1 mm is a planning allowance, not a vendor dimension. Measure antenna and lead.',
  modelNote:'Reuses the existing flexible antenna planning model; exact included-antenna geometry is unverified.',
  placement:'Along a nonmetal case edge. Check clearance to battery, PCB and wrist before finalizing the case.',
  electrical:'Attach the included antenna to XIAO U.FL. Do not add the large RP-SMA adapter to this connection.',
  purchaseLinks:[['Included with XIAO',WATCH_SOURCES.controller]],links:[['Seeed parts list',WATCH_SOURCES.controller]]}
];
