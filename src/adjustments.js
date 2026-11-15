import { validateState, moveInstance, partFor } from './engine.js';
import { PARTS } from './catalog.js';
import { libraryPart } from './product-data.js';
import { portsFor, connectionIssues } from './connections.js';
import { validateQuestion } from './chat-data.js';
const vector=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max);
export function validateAdjustment(value,ids){
 if(!value||typeof value.message!=='string'||!value.message.trim()||value.message.length>2400||!Array.isArray(value.changes)||value.changes.length>12||!(value.enclosure===null||vector(value.enclosure,1,2000)))throw Error('Invalid adjustment proposal.');
 const additions=value.additions??[],removals=value.removals??[],connections=value.connections??[],removeConnections=value.removeConnections??[];
 const question=validateQuestion(value.question);
 if(question&&(value.changes.length||value.enclosure||additions.length||removals.length||connections.length||removeConnections.length))throw Error('Answer the question before proposing changes.');
 if(!Array.isArray(additions)||additions.length>12||!Array.isArray(removals)||removals.length>12||!Array.isArray(connections)||connections.length>60||!Array.isArray(removeConnections)||removeConnections.length>60)throw Error('Too many assembly actions.');
 const added=new Set(),removed=new Set();
 for(const a of additions){if(!a||!/^new-[a-z0-9-]{1,60}$/.test(a.key)||added.has(a.key)||ids.includes(a.key)||(!ids.includes(a.sourceId)&&!PARTS[a.sourceId])||a.sourceId==='kit'||!vector(a.position,-2000,2000)||!vector(a.rotation,-360,360))throw Error('Invalid part addition.');added.add(a.key);}
 for(const id of removals){if(!ids.includes(id)||removed.has(id))throw Error('Invalid part removal.');removed.add(id);}
 const available=[...ids.filter(id=>!removed.has(id)),...added];
 for(const c of connections){if(!c||![c.fromPart,c.toPart].every(id=>available.includes(id))||![c.fromPort,c.toPort].every(id=>typeof id==='string'&&/^[a-zA-Z0-9+_-]{1,80}$/.test(id))||c.fromPart===c.toPart||typeof c.type!=='string'||!c.type.trim()||c.type.length>100||typeof c.bundle!=='string'||c.bundle.length>100||typeof c.note!=='string'||c.note.length>1500||!Number.isFinite(c.length)||c.length<0||c.length>5000||!/^#[a-f0-9]{6}$/i.test(c.color))throw Error('Invalid cable proposal.');}
 if(removeConnections.some(id=>typeof id!=='string'||!id||id.length>100)||new Set(removeConnections).size!==removeConnections.length)throw Error('Invalid cable removal.');
 const seen=new Set();
 const changes=value.changes.map(change=>{
  if(!change||typeof change.partId!=='string'||!available.includes(change.partId)||seen.has(change.partId)||!(change.position===null||vector(change.position,-2000,2000))||!(change.rotation===null||vector(change.rotation,-360,360))||!(change.dimensions===null||vector(change.dimensions,.1,1000))||!(change.note===null||(typeof change.note==='string'&&change.note.length<=2000)))throw Error('The assistant returned an invalid part adjustment.');
  seen.add(change.partId);return {partId:change.partId,position:change.position,rotation:change.rotation,dimensions:change.dimensions,note:change.note};
 });
 return {message:value.message,changes,enclosure:value.enclosure,...(value.question!==undefined?{question}:{}),...(value.additions!==undefined?{additions:additions.map(a=>({key:a.key,sourceId:a.sourceId,position:[...a.position],rotation:[...a.rotation]}))}:{}),...(value.removals!==undefined?{removals:[...removals]}:{}),...(value.connections!==undefined?{connections:connections.map(c=>Object.fromEntries(['fromPart','fromPort','toPart','toPort','type','bundle','length','color','note'].map(k=>[k,c[k]])))}:{}),...(value.removeConnections!==undefined?{removeConnections:[...removeConnections]}:{})};
}
export function applyAdjustments(state,proposal){
 const next=validateState(state),p=validateAdjustment(proposal,next.instances.map(i=>i.id));
 // Resolve new aliases once within this transaction. Reuse source CAD and ports.
 const aliases=new Map();
 for(const a of p.additions||[]){
  let id;
  if(PARTS[a.sourceId])id=libraryPart(next,a.sourceId);
  else{const source=partFor(next,a.sourceId),instance=next.instances.find(i=>i.id===a.sourceId);id='custom-'+crypto.randomUUID();next.custom.push({...structuredClone(source),id,name:source.name+' · copy',short:source.short+' · copy',ports:structuredClone(portsFor(next,a.sourceId))});next.instances.push({...structuredClone(instance),id});}
  aliases.set(a.key,id);const instance=next.instances.find(i=>i.id===id),sourceInstance=state.instances.find(i=>i.id===a.sourceId);if(sourceInstance)instance.dimensions=[...sourceInstance.dimensions];instance.position=[...a.position];instance.rotation=[...a.rotation];
 }
 const removed=new Set(p.removals||[]);
 if(next.lockCore&&removed.has('expansion')&&!removed.has('xiao')&&next.instances.some(i=>i.id==='xiao'))throw Error('Remove the mounted XIAO with its carrier, or unlock the mount first.');
 next.instances=next.instances.filter(i=>!removed.has(i.id));next.custom=next.custom.filter(i=>!removed.has(i.id));
 next.notes=next.notes.filter(n=>!removed.has(n.part));for(const id of removed)delete next.decisions[id];
 for(const id of p.removeConnections||[])if(!next.connections.some(c=>c.id===id))throw Error('A cable to remove no longer exists.');
 next.connections=next.connections.filter(c=>!(p.removeConnections||[]).includes(c.id)&&![c.from,c.to].some(ref=>removed.has(ref.split(':')[0])));
 // Validate every change before returning a new state; callers apply one undoable edit.
 for(const change of p.changes){
  const c={...change,partId:aliases.get(change.partId)||change.partId};
  const part=next.instances.find(i=>i.id===c.partId);
  if((c.position||c.rotation)&&c.partId==='xiao'&&next.lockCore&&next.instances.some(i=>i.id==='expansion'))throw Error('XIAO is attached to the carrier. Ask to move the carrier instead.');
  if(c.position||c.rotation)moveInstance(next,c.partId,c.position||part.position,c.rotation||part.rotation);
  if(c.dimensions)part.dimensions=[...c.dimensions];
  if(c.note)next.notes.push({part:c.partId,text:c.note,at:new Date().toISOString()});
 }
 for(const c of p.connections||[]){
  const from=(aliases.get(c.fromPart)||c.fromPart)+':'+c.fromPort,to=(aliases.get(c.toPart)||c.toPart)+':'+c.toPort;
  if(!portsFor(next,from.split(':')[0]).some(p=>p.id===c.fromPort)||!portsFor(next,to.split(':')[0]).some(p=>p.id===c.toPort))throw Error('A proposed contact does not exist.');
  if(next.connections.some(w=>(w.from===from&&w.to===to)||(w.from===to&&w.to===from)))throw Error('This cable connection already exists.');
  const cable={id:crypto.randomUUID(),from,to,type:c.type,bundle:c.bundle,length:c.length,color:c.color,status:'Planned',note:'Codex proposal — verify physical pinout and cable. '+c.note};
  const invalid=connectionIssues(next,cable).find(issue=>/short|not a valid motor|RF coax|crossed|Power rails differ|Power connected to a signal|Unknown endpoint|outside the assembly/.test(issue));
  if(invalid)throw Error(invalid);next.connections.push(cable);
 }
 if(p.enclosure)next.enclosure=[...p.enclosure];
 return validateState(next);
}
