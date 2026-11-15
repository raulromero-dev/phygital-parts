import { emptyProject } from './product-data.js';
import { PARTS } from './catalog.js';
import { WATCH_SIGNALS, WATCH_SOURCES } from './smartwatch.js';

export function smartwatchTemplate(){
 const state=emptyProject('Smartwatch · XIAO');
 state.preset='smartwatch';state.enclosure=[48,29,48];
 state.brief='Seeed XIAO ESP32-S3 + Round Display smartwatch starter. Header connections are mapped; battery adapter and final enclosure need review.';
 const placements=[['watch-battery',[0,3.375,4],[0,0,0]],['xiao',[0,11,-9.652],[0,0,180]],['watch-antenna',[18.5,11,0],[0,90,0]],['watch-display',[0,21,0],[0,0,0]]];
 state.instances=placements.map(([id,position,rotation])=>({id,position,rotation,dimensions:[...PARTS[id].dimensions]}));
 state.connections=WATCH_SIGNALS.map(([id,label])=>({id:'watch-header-'+id,from:'xiao:'+id,to:'watch-display:'+id,type:'Board-to-board headers',bundle:'XIAO ↔ round display',length:0,color:'#888888',status:'Planned',note:`${label}. Direct 2 × 7 header/socket connection; no jumper cable. Seeed v1.1 pin map. Choose pre-soldered XIAO headers or solder the supplied headers first.`}));
 state.connections.push({id:'watch-coax',from:'xiao:rf',to:'watch-antenna:rf',type:'U.FL coax / adapter',bundle:'Included antenna coax',length:0,color:'#888888',status:'Planned',note:'Included antenna plugs directly into XIAO U.FL. Measure the supplied lead; no RP-SMA adapter. Routing is illustrative.'});
 state.decisions={'watch-battery':'Hold'};
 state.notes=[{part:'watch-battery',at:new Date().toISOString(),text:PARTS['watch-battery'].electrical},{part:'watch-display',at:new Date().toISOString(),text:'Prototype envelope only. Manufacturer case STL is a reference, not a validated fit for this battery and stack. No strap, haptics, IMU, waterproofing or finished watch firmware is included.'}];
 state.projectLinks=[WATCH_SOURCES.firmware,WATCH_SOURCES.hardware];
 state.research={summary:state.brief,questions:['Select and meter the battery adapter before mapping its two conductors.','Measure the assembled thickness, antenna and cable route before designing the wrist case.'],sources:[{label:'Hardware & schematics',url:WATCH_SOURCES.hardware},{label:'Pin map',url:WATCH_SOURCES.guide},{label:'Open-source firmware',url:WATCH_SOURCES.firmware},{label:'Manufacturer case STL',url:WATCH_SOURCES.case}],at:new Date().toISOString()};
 return state;
}
