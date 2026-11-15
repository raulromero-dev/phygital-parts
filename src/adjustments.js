import { validateState, moveInstance } from './engine.js';
const vector=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max);
export function validateAdjustment(value,ids){
 if(!value||typeof value.message!=='string'||!value.message.trim()||value.message.length>2400||!Array.isArray(value.changes)||value.changes.length>12||!(value.enclosure===null||vector(value.enclosure,1,2000)))throw Error('Invalid adjustment proposal.');
 const seen=new Set();
 const changes=value.changes.map(change=>{
  if(!change||typeof change.partId!=='string'||!ids.includes(change.partId)||seen.has(change.partId)||!(change.position===null||vector(change.position,-2000,2000))||!(change.rotation===null||vector(change.rotation,-360,360))||!(change.dimensions===null||vector(change.dimensions,.1,1000))||!(change.note===null||(typeof change.note==='string'&&change.note.length<=2000)))throw Error('The assistant returned an invalid part adjustment.');
  seen.add(change.partId);return {partId:change.partId,position:change.position,rotation:change.rotation,dimensions:change.dimensions,note:change.note};
 });
 return {message:value.message,changes,enclosure:value.enclosure};
}
export function applyAdjustments(state,proposal){
 const next=validateState(state),p=validateAdjustment(proposal,next.instances.map(i=>i.id));
 // Validate every change before returning a new state; callers apply one undoable edit.
 for(const c of p.changes){
  const part=next.instances.find(i=>i.id===c.partId);
  if((c.position||c.rotation)&&c.partId==='xiao'&&next.lockCore&&next.instances.some(i=>i.id==='expansion'))throw Error('XIAO is attached to the carrier. Ask to move the carrier instead.');
  if(c.position||c.rotation)moveInstance(next,c.partId,c.position||part.position,c.rotation||part.rotation);
  if(c.dimensions)part.dimensions=[...c.dimensions];
  if(c.note)next.notes.push({part:c.partId,text:c.note,at:new Date().toISOString()});
 }
 if(p.enclosure)next.enclosure=[...p.enclosure];
 return validateState(next);
}
