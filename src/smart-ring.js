import geometry from './ring-geometry.json' with {type:'json'};
export const RING_SOURCE='https://github.com/Sense-Ring/Sense-Ring-1.0';
const base={owned:false,quantity:1,category:'Candidate',confidence:'manufacturer',sources:[],tags:['Smart ring'],photo:'SenseRing 1.0 · GPL-3.0 open hardware',dimensionNote:'Envelope measured from the upstream CAD. Validate actual assembly tolerances and ring size.',modelNote:'Reused SenseRing STL geometry; presentation colors added. GPL-3.0 source and conversion script are available below.',links:[['Open hardware & firmware',RING_SOURCE],['Model source + license','https://phygitalstudio.app/reference/sense-ring/source.zip']]};
export const RING_PARTS=[
 {...base,id:'ring-board',name:'SenseRing sensor PCB assembly',short:'Ring sensor board',kind:'board',color:'#164a3c',dimensions:geometry['ring-board'].dimensions,interface:'nRF52832 BLE · MAX30102 · BMA530 · BQ25180',summary:'Integrated sensing, radio and charging board from the open SenseRing project.',placement:'Original CAD location in the ring crown. Fine-pitch assembly is required.',electrical:'Battery attaches to BAT+ and BAT− pads. BAT− returns through protection and is not the same net as system GND. Review charger settings, optical performance and the SWD interface.',procurementLabel:'Build files',procurementLinks:[['PCB & schematic · fabrication required',RING_SOURCE+'/tree/main/Hardware']]},
 {...base,id:'ring-battery',name:'Grepow GRP1607034 · curved battery reference',short:'Curved ring battery',kind:'battery',color:'#af862f',dimensions:geometry['ring-battery'].dimensions,interface:'31 mAh reference · battery tabs',summary:'Curved cell specified by the upstream project. Exact current availability and electrical limits require a vendor quote.',placement:'Use the supplied curved CAD shape; do not bend a flat pouch to match it.',electrical:'Hold until Grepow confirms the exact cell specification, polarity and charge limits and these match the BQ25180 configuration. The example maps battery pads only; it is not a plug-in cable.',procurementLabel:'Source a cell',procurementLinks:[['Grepow · request exact cell / quote','https://www.grepow.com/wearables/smart-ring.html']]},
 ...[['ring-inner','Inner ring shell'],['ring-outer','Outer ring shell']].map(([id,name])=>({...base,id,name,short:name,kind:'other',color:id==='ring-inner'?'#334452':'#9aa4aa',dimensions:geometry[id].dimensions,interface:'Mechanical enclosure · no electrical contacts',summary:'Printable shell from the upstream ring assembly.',placement:'Hollow geometry surrounds the board and battery. Bounding boxes cannot certify internal clearance.',electrical:'No electrical contacts. Validate material, insulation, skin contact and sensor aperture.',procurementLabel:'Make this part',procurementLinks:[['Print from source CAD',RING_SOURCE+'/tree/main/Mechanical']]}))
];
export const RING_PORTS={
 'ring-board':[
  {id:'bat+',label:'BAT+ · VBAT',signal:'power',rail:'cell',group:'Solder pads',anchor:[.879,-.2,.065]},
  {id:'bat-',label:'BAT− · protected return',signal:'ground',rail:'0',group:'Solder pads',anchor:[.879,.2,.065]}
 ],
 'ring-battery':[
  {id:'positive',label:'Cell + · verify',signal:'power',rail:'cell',group:'Battery tabs · positions approximate',anchor:[-.6,0,1]},
  {id:'negative',label:'Cell − · verify',signal:'ground',rail:'0',group:'Battery tabs · positions approximate',anchor:[-.3,0,1]}
 ],'ring-inner':[],'ring-outer':[]
};
export const RING_INTERNALS=[
 {name:'BLE controller',route:'nRF52832 with onboard RF antenna. Shared I²C uses P0.29 SDA and P0.28 SCL.',evidence:'SenseRing hardware sources'},
 {name:'Integrated sensors',route:'MAX30102 optical sensor and BMA530 accelerometer are mounted on the PCB; these are not external plug-in modules.',evidence:'SenseRing hardware sources'},
 {name:'Charging and debug',route:'BQ25180 charging plus battery protection. TC2030 footprint provides SWD and charging access; verify the fixture and supply.',evidence:'SenseRing hardware sources'}
];
export function ringInstances(){return Object.entries(geometry).map(([id,part])=>({id,position:[...part.position],dimensions:[...part.dimensions],rotation:[0,0,0]}));}
