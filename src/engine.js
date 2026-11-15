import { safeUrl } from './product-data.js';
import { planningIssues } from './planning.js';
import { Box3, Vector3, Matrix3, Matrix4, Euler, Quaternion } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { endpoint, seedConnections, connectionIssues, activeConnections } from './connections.js';
import { PARTS, defaultState } from './catalog.js';
export const STORAGE_KEY='phygital.parts.v1';
export const clone=x=>JSON.parse(JSON.stringify(x));
export const partFor=(state,id)=>PARTS[id]||state.custom.find(p=>p.id===id);
export const radians=r=>r.map(n=>n*Math.PI/180);
export function boxFor(i) {
  const rotation=new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...radians(i.rotation))));
  return new OBB(new Vector3(...i.position),new Vector3(...i.dimensions).multiplyScalar(.5),rotation);
}
export function bounds(i) {
  const q=new Quaternion().setFromEuler(new Euler(...radians(i.rotation))); const b=new Box3();
  for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]) b.expandByPoint(new Vector3(x*i.dimensions[0],y*i.dimensions[1],z*i.dimensions[2]).applyQuaternion(q).add(new Vector3(...i.position)));
  return b;
}
export function envelope(state) {
  if(!state.instances.length)return [0,0,0];
  const b=new Box3();state.instances.forEach(i=>b.union(bounds(i))); return b.getSize(new Vector3()).toArray().map(v=>Math.round(v*10)/10);
}
export function mounted(a,b) {
  if(!a||!b)return false;
  const q=new Quaternion().setFromEuler(new Euler(...radians(a.rotation)));
  const target=new Vector3(0,8.5,-17).applyQuaternion(q).add(new Vector3(...a.position));
  const sameRotation=new Quaternion().setFromEuler(new Euler(...radians(b.rotation))).angleTo(q)<.001;
  return target.distanceTo(new Vector3(...b.position))<.2&&sameRotation;
}
// Moving the carrier also moves its seated XIAO, including rotation around the
// carrier origin. This is a physical mount; all other connections are advisory.
export function moveInstance(state,id,position,rotation) {
  const i=state.instances.find(v=>v.id===id);if(!i)return;
  if(id==='xiao'&&state.lockCore&&state.instances.some(p=>p.id==='expansion'))return;
  i.position=[...position];i.rotation=[...rotation];
  const x=state.instances.find(v=>v.id==='xiao');
  if(id==='expansion'&&state.lockCore&&x){
    const q=new Quaternion().setFromEuler(new Euler(...radians(rotation)));
    x.position=new Vector3(0,8.5,-17).applyQuaternion(q).add(new Vector3(...position)).toArray();x.rotation=[...rotation];
  }
}
const gap=(a,b)=>Math.hypot(...['x','y','z'].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
export function checks(state) {
  const result=[];const items=state.instances;const has=id=>items.some(i=>i.id===id);const get=id=>items.find(i=>i.id===id);
  const add=(level,title,detail,ids=[],type='Electrical')=>result.push({level,title,detail,ids,type});
  if(state.instances.some(i=>i.id==='expansion'))for(const c of planningIssues(state))add('warn',c.title,c.detail,c.ids,'Wiring');
  const e=state.enclosure;const interior=new Box3(new Vector3(-e[0]/2,0,-e[2]/2),new Vector3(e[0]/2,e[1],e[2]/2));
  for(const i of items){const p=partFor(state,i.id); if(!interior.containsBox(bounds(i)))add('warn',`${p.short} extends outside`, 'Part envelope crosses the proposed interior. Adjust placement, rotation or the enclosure dimensions.',[i.id],'Fit');}
  for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){
    const ia=items[a],ib=items[b];
    // The compact cradle is hollow; the lid rim surrounds its mirror insert.
    const compactPair=[ia.id,ib.id];
    if((compactPair.includes('compact-base')&&compactPair.includes('cardputer-adv'))||(compactPair.includes('compact-lid')&&compactPair.includes('compact-mirror')))continue;
    // Hollow shells enclose other geometry; their bounding boxes cannot resolve clearance.
    if([ia.id,ib.id].every(id=>id.startsWith('ring-'))&&[ia.id,ib.id].some(id=>['ring-inner','ring-outer'].includes(id)))continue;
    // Touching faces are a valid seating contact, so shrink only for numerical tolerance.
    const ba=boxFor(ia),bb=boxFor(ib);ba.halfSize.multiplyScalar(.998);bb.halfSize.multiplyScalar(.998);
    if(ba.intersectsOBB(bb)){
      const curved=[ia.id,ib.id].includes('ring-battery')&&[ia.id,ib.id].includes('ring-board');
      add(curved?'review':'warn',curved?'Ring battery clearance needs CAD review':`${partFor(state,ia.id).short} overlaps ${partFor(state,ib.id).short}`,curved?'The curved battery and PCB bounding boxes intersect in the upstream assembly. Inspect their actual surfaces in CAD; this is not a verified clearance.':'The rotated bounding envelopes intersect. Detailed geometry, cable routing and tolerances still need a bench check.',[ia.id,ib.id],'Fit');
    }
  }
  if(has('expansion')&&has('xiao')&&!mounted(get('expansion'),get('xiao')))add('warn','XIAO is off its mount','Carrier and XIAO no longer match the modelled socket position. Re-seat with “Attach to carrier”.',['xiao','expansion'],'Fit');
  if(has('watch-display'))add('review','Watch pin allocation','The display, touch, RTC and microSD occupy the XIAO headers. D0/D6 can be released by the board switches; review pin use before adding a sensor or haptics.',['watch-display','xiao']);
  if(has('watch-battery'))add('review','Watch battery needs an adapter','PH2.0 battery plug does not directly fit the Round Display 1.25 mm socket. Select and meter the adapter, verify charge current and reserve cable space. The starter leaves it unconnected.',['watch-battery','watch-display']);
  if(has('watch-round-battery'))add('warn','Round battery charging mismatch','LPR553535 permits 300 mA maximum charging; the Round Display lists approximately 485 mA. Reduce and verify charge current or choose another charging path. Confirm the PHR-2 to 1.25 mm adapter and polarity. Battery remains on hold.',['watch-round-battery','watch-display']);
  if(has('watch-antenna'))add('review','Measure included antenna','Antenna dimensions and coax length are planning allowances. Check clearance from battery, PCB and wrist.',['watch-antenna']);
  if(has('grove-scd41'))add('review','Air sensor power & ventilation',PARTS['grove-scd41'].electrical+' Keep the inlet exposed to ambient air, away from controller heat.',['grove-scd41','expansion']);
  if(has('ring-inner')||has('ring-outer'))add('review','Ring shell clearance needs CAD review','Hollow shell envelopes intentionally surround the electronics. Inspect the original CAD for wall thickness, finger size, internal contact and manufacturing tolerances; box checks cannot validate these surfaces.',['ring-inner','ring-outer'],'Fit');
  if(has('ring-board'))add('review','Smart ring requires fabrication','This is an open hardware assembly, not a plug-in kit. Verify PCB production files, fine-pitch assembly, battery charge settings, firmware and material choice.',['ring-board','ring-battery']);
  if(has('compact-base')||has('compact-lid'))add('review','Compact case needs mechanical review','Open-position concept only. The hollow cradle and mirror rim cannot be checked with solid boxes. Validate closed clearance, hinge sweep, retention, port openings and antenna spacing in CAD. No fabricated case or selected hinge is implied.',['compact-base','compact-lid','compact-mirror','compact-hinge'],'Fit');
  if(has('battery'))add('review','Verify battery polarity & charging','Confirm the JST pinout, protection and ONE charging path before applying power. Cell dimensions and pouch clearance need measurement.',['battery']);
  if(has('thermal')){
    add('review','Thermal opening & breakout voltage','Keep the lens aperture open to long-wave IR. Verify the seller breakout supply and I²C pull-up rail; the bare sensor is 3.3 V.',['thermal']);
    const nearby=['xiao','battery'].filter(id=>has(id)&&gap(bounds(get('thermal')),bounds(get(id)))<15);
    if(nearby.length)add('warn','Thermal sensor near a heat source','Less than 15 mm between envelopes. This is a planning heuristic, not a manufacturer clearance rule; test drift in the enclosure.',['thermal',...nearby],'Fit');
  }
  if(has('strip')&&has('rod'))add('warn','Two antennas, one RF connector','Choose the bench antenna or the strip replacement. No RF switch or splitter is modelled.',['strip','rod']);
  if(has('strip')){
    add('review','Strip antenna SKU still needed','Confirm 2.4 GHz, 50 Ω, connector variant, cable and vendor ground clearance. Calibrate RSSI again after replacement.',['strip']);
    if(['battery','expansion'].some(id=>has(id)&&gap(bounds(get('strip')),bounds(get(id)))<10))add('warn','Antenna close to metal / battery','Less than 10 mm between envelopes. Use the selected antenna manufacturer’s keep-out; measure reception in the final grip.',['strip'],'Fit');
  }
  if(has('motor')&&!has('mosfet-1'))add(has('driver')?'review':'warn',has('driver')?'Haptic firmware & current check':'Coin motor needs a driver',has('driver')?'Driver is in the layout. Verify its power rail, motor configuration and firmware; implement and verify firmware for your chosen controller.':'Do not connect the motor to a GPIO. Add a suitable driver/circuit and check rated and stall current.',['motor',...(has('driver')?['driver']:[])]);
  if(has('rf'))add('warn','RF detector integration incomplete','Needs a suitable antenna/filter, verified supply and ADC voltage range, pin assignment, calibration and firmware. Broadband power does not identify a tracker.',['rf']);
  if(has('charger')&&(has('xiao')||has('expansion')))add('warn','Resolve the charging architecture','A charger is already on the carrier and XIAO. Do not parallel charging outputs. Document which charger and power path are active.',['charger','battery']);
  if(has('jst'))add('review','JST mating is not polarity proof','Meter both cable ends before connecting the cell. Wire colors and matching shells do not guarantee polarity.',['jst']);
  for(const p of state.custom.filter(p=>has(p.id)))add('review',`${p.short}: compatibility unreviewed`,'Custom components have no automatic pin, voltage or firmware assessment. Add evidence and a review note.',[p.id]);
  for(const c of activeConnections(state)){const problems=connectionIssues(state,c).filter(x=>/short|crossed|rails differ|signal pin|not a valid|more than one|multiple planned sources|RF coax must/.test(x));for(const text of problems)add('warn',c.bundle||'Cable connection',text,[c.from.split(':')[0],c.to.split(':')[0]],'Wiring');}
  if(!result.some(c=>c.type==='Fit'))add('ok','No envelope collisions found','Within the modelled interior. Models are approximate; connectors, wires, fasteners, heat and tolerances are not certified.',[],'Fit');
  return result;
}
export function runtime(state){return state.instances.some(i=>i.id==='battery')?2500*(state.assumptions.usable/100)/state.assumptions.current:0;}
const num=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const vec=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>num(n,min,max));
const str=(v,max=4000)=>typeof v==='string'&&v.length<=max;
// Imported and AI-created parts retain only known, bounded data. Never revive code or keys.
function normalizeCustom(p){
 const text=(key,fallback)=>str(p[key],4000)?p[key]:fallback;
 const links=key=>(Array.isArray(p[key])?p[key]:[]).filter(link=>Array.isArray(link)&&str(link[0],150)&&safeUrl(link[1])).slice(0,12).map(([label,url])=>[label,safeUrl(url)]);
 const models=new Set(Object.values(PARTS).map(part=>part.modelId||part.id));
 return {id:p.id,name:p.name,short:str(p.short,100)?p.short:p.name,dimensions:[...p.dimensions],owned:!!p.owned,category:'Custom',kind:['board','chip','camera','battery','screen','motor','connector','antenna','other','headers','strip'].includes(p.kind)?p.kind:'board',color:/^#[a-f0-9]{6}$/i.test(p.color)?p.color:'#124567',confidence:['sourced','estimate','unknown','manufacturer','partial','listing'].includes(p.confidence)?p.confidence:'estimate',dimensionNote:text('dimensionNote','User-entered dimensions; verify clearance.'),interface:text('interface','Unspecified'),summary:text('summary','Custom component; compatibility unreviewed.'),placement:text('placement','Check mounting and clearance.'),electrical:text('electrical','Check pinout, supply and current requirements.'),sources:[],photo:text('photo','User-added component'),modelNote:text('modelNote','Parametric planning envelope; not manufacturer CAD.'),...(models.has(p.modelId)?{modelId:p.modelId}:{}),links:links('links'),purchaseLinks:links('purchaseLinks'),procurementLabel:text('procurementLabel','Buy'),procurementLinks:links('procurementLinks'),quantity:1,ports:Array.isArray(p.ports)?p.ports.filter(q=>/^[a-z0-9+_-]+$/.test(q.id)&&str(q.label,100)&&['unknown','sda','scl','power','ground','gpio','rf','motor','analog','tx','rx','usb'].includes(q.signal)).slice(0,40).map(q=>({id:q.id,label:q.label,signal:q.signal,group:str(q.group,150)?q.group:'Custom contacts',anchor:vec(q.anchor,-1,1)?[...q.anchor]:[0,0,0],rail:str(q.rail,30)?q.rail:'unknown'})):[],tags:['Custom']};
}
export function validateState(v) {
  if(!v||v.version!==1||!str(v.name,120)||!Array.isArray(v.instances)||v.instances.length>60||!vec(v.enclosure,1,2000))throw Error('This is not a valid Hardware Studio v1 project.');
  const custom=Array.isArray(v.custom)?v.custom:[];
  if(custom.length>40||custom.some(p=>!/^custom-[a-z0-9-]+$/.test(p.id)||!str(p.name,100)||!vec(p.dimensions,.1,1000)))throw Error('Invalid custom component.');
  if(new Set(custom.map(p=>p.id)).size!==custom.length)throw Error('Duplicate custom component IDs.');
  const ids=new Set([...Object.keys(PARTS),...custom.map(p=>p.id)]);
  if(v.instances.some(i=>!ids.has(i.id)||i.id==='kit'||!vec(i.position,-2000,2000)||!vec(i.rotation,-360,360)||!vec(i.dimensions,.1,1000))||new Set(v.instances.map(i=>i.id)).size!==v.instances.length)throw Error('Invalid component placement or dimensions.');
  if(!v.assumptions||!num(v.assumptions.current,1,5000)||!num(v.assumptions.usable,1,100))throw Error('Invalid runtime assumptions.');
  if(!Array.isArray(v.notes)||v.notes.length>500||v.notes.some(n=>!str(n.text)||!str(n.part,100)||!str(n.at,60)))throw Error('Invalid review notes.');
  const clean=defaultState();
  Object.assign(clean,{name:v.name,instances:v.instances.map(i=>({id:i.id,position:[...i.position],rotation:[...i.rotation],dimensions:[...i.dimensions]})),enclosure:[...v.enclosure],enclosureVisible:v.enclosureVisible!==false,lockCore:v.lockCore!==false,assumptions:{...v.assumptions},notes:v.notes.map(n=>({text:n.text,part:n.part,at:n.at})),custom:custom.map(normalizeCustom),decisions:{}});
  clean.preset=str(v.preset,30)?v.preset:'blank';
  clean.brief=str(v.brief,8000)?v.brief:'';
  clean.projectLinks=Array.isArray(v.projectLinks)?v.projectLinks.filter(safeUrl).slice(0,5):[];
  if(v.research&&str(v.research.summary,4000))clean.research={summary:v.research.summary,questions:Array.isArray(v.research.questions)?v.research.questions.filter(q=>str(q,1000)).slice(0,12):[],sources:Array.isArray(v.research.sources)?v.research.sources.filter(q=>str(q.label,150)&&safeUrl(q.url)).slice(0,24):[],at:str(v.research.at,60)?v.research.at:''};
  for(const [id,value] of Object.entries(v.decisions||{}))if(ids.has(id)&&['Investigate','Hold','Approve','Skip'].includes(value))clean.decisions[id]=value;
  clean.connections=[];
  const connections=v.connections===undefined?seedConnections(v.preset):v.connections;
  if(!Array.isArray(connections)||connections.length>200)throw Error('Invalid cable plan.');
  for(const c of connections){
    if(!str(c.id,100)||!str(c.from,150)||!str(c.to,150)||!endpoint(clean,c.from)||!endpoint(clean,c.to)||c.from===c.to||!str(c.type,100)||!str(c.bundle,100)||!num(c.length,0,5000)||!/^#[0-9a-fA-F]{6}$/.test(c.color)||!['Planned','Bench checked'].includes(c.status)||!str(c.note))throw Error('Invalid cable endpoint or specification.');
    if(clean.connections.some(x=>x.id===c.id))throw Error('Duplicate cable ID.');
    clean.connections.push({id:c.id,from:c.from,to:c.to,type:c.type,bundle:c.bundle,length:c.length,color:c.color,status:c.status,note:c.note});
  }
  return clean;
}
export function reviewBrief(state){
  return `# Phygital assembly review — ${state.name}\n\nPlanning models; no electrical certification. Dimensions in mm (X width, Y height, Z depth).\n\n## Assembly\n${state.instances.map(i=>`- ${partFor(state,i.id).name}: ${i.dimensions.join(' × ')}; centre ${i.position.map(n=>n.toFixed(1)).join(', ')}; rotation ${i.rotation.join(', ')}°`).join('\n')}\n\n## Cable plan\n${(state.connections||[]).map(c=>`- ${c.from} → ${c.to}: ${c.type}, ${c.length} mm, ${c.status}. ${c.note}`).join('\n')}\n\n## Checks\n${checks(state).map(c=>`- [${c.level}] ${c.title}: ${c.detail}`).join('\n')}\n\n## Purchase decisions (no orders placed)\n${Object.entries(state.decisions).map(([id,d])=>`- ${partFor(state,id)?.name||id}: ${d}`).join('\n')}\n\n## Discussion\n${state.notes.map(n=>`- ${n.at} · ${n.part}: ${n.text}`).join('\n')}\n\nPlease help assess placement, wiring, missing parts and which purchases to approve.\n`;
}
