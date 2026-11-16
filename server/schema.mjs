import { sourcingSchema } from './sourcing.mjs';
import { cleanSourcing } from '../src/sourcing.js';
import { modelEvidence } from '../src/model-data.js';
const text={type:'string'};
const list=items=>({type:'array',items});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const link=obj({label:text,url:text});
const vector={type:'array',items:{type:'number'},minItems:3,maxItems:3};
export const proposalSchema=obj({
 sourcing:sourcingSchema,
 projectName:text,summary:text,enclosure:obj({width:{type:'number'},height:{type:'number'},depth:{type:'number'}}),
 parts:list(obj({key:text,catalogId:{type:['string','null']},name:text,kind:{type:'string',enum:['board','chip','camera','battery','screen','motor','connector','antenna','other']},
  dimensions:obj({width:{type:'number'},height:{type:'number'},depth:{type:'number'},confidence:{type:'string',enum:['sourced','estimate','unknown']}}),description:text,interface:text,electrical:text,placement:text,color:text,position:vector,rotation:vector,
  model:obj({cadUrl:text,cadFormat:{type:'string',enum:['glb','stl','step','none']},cadSourceUrl:text,imageUrl:text,imageSourceUrl:text}),purchaseLinks:list(link),sources:list(link),ports:list(obj({id:text,label:text,signal:{type:'string',enum:['unknown','sda','scl','power','ground','gpio','rf','motor','analog','tx','rx','usb']},rail:text,group:text,anchor:vector}))
 })),connections:list(obj({fromPart:text,fromPort:text,toPart:text,toPort:text,type:text,bundle:text,note:text})),questions:list(text),sources:list(link)
});
const bounded=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const short=(s,max=2000)=>typeof s==='string'&&s.length<=max;
export function publicUrl(value){
 try{const u=new URL(value),h=u.hostname.toLowerCase();return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&!/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(h)&&h.includes('.')?u.href:null;}catch{return null;}
}
export function validateProposal(p){
 if(!p||!short(p.projectName,120)||!short(p.summary,4000)||!p.enclosure||!['width','height','depth'].every(k=>bounded(p.enclosure[k],1,2000))||!Array.isArray(p.parts)||p.parts.length>20||!Array.isArray(p.connections)||p.connections.length>120)throw Error('The agent returned an invalid assembly. Try a more specific request.');
 if(p.sourcing)p.sourcing=cleanSourcing(p.sourcing);
 const keys=new Set();
 for(const item of p.parts){
  if(!/^[a-z0-9-]{1,70}$/.test(item.key)||keys.has(item.key)||!short(item.name,100)||!item.dimensions||!['width','height','depth'].every(k=>bounded(item.dimensions[k],.1,1000))||!/^#[a-f0-9]{6}$/i.test(item.color)||!['position','rotation'].every(k=>Array.isArray(item[k])&&item[k].length===3&&item[k].every(n=>bounded(n,k==='rotation'?-360:-2000,k==='rotation'?360:2000))))throw Error('The agent returned invalid part dimensions or placement.');
  if(!['board','chip','camera','battery','screen','motor','connector','antenna','other'].includes(item.kind)||!['sourced','estimate','unknown'].includes(item.dimensions.confidence)||item.catalogId!==null&&!short(item.catalogId,100))throw Error('Invalid part type.');
  keys.add(item.key);if(item.model)item.model=modelEvidence(item.model);
  if(!Array.isArray(item.ports)||item.ports.length>40)throw Error('Too many contacts on a proposed part.');
  const portIds=new Set();
  for(const port of item.ports){if(!short(port.label,100)||!short(port.group,150)||!short(port.rail,30)||!['unknown','sda','scl','power','ground','gpio','rf','motor','analog','tx','rx','usb'].includes(port.signal)||!/^[a-z0-9-]{1,60}$/.test(port.id)||portIds.has(port.id)||!Array.isArray(port.anchor)||port.anchor.length!==3||!port.anchor.every(n=>bounded(n,-1,1)))throw Error('Invalid contact geometry.');portIds.add(port.id);}
  for(const field of ['description','interface','electrical','placement'])if(!short(item[field]))throw Error('Part description exceeds the limit.');
  for(const field of ['purchaseLinks','sources'])item[field]=(item[field]||[]).filter(l=>short(l.label,150)&&publicUrl(l.url)).slice(0,8);
 }
 p.sources=(p.sources||[]).filter(l=>short(l.label,150)&&publicUrl(l.url)).slice(0,24);
 p.questions=(p.questions||[]).filter(q=>short(q,1000)).slice(0,12);
 for(const c of p.connections)if(!keys.has(c.fromPart)||!keys.has(c.toPart)||!Object.values(c).every(v=>short(v,1500)))throw Error('Invalid proposed connection.');
 p.parts=p.parts.map(item=>Object.fromEntries(['key','catalogId','name','kind','dimensions','description','interface','electrical','placement','color','position','rotation','purchaseLinks','sources','ports',...(item.model?['model']:[])].map(key=>[key,item[key]])));
 return p;
}

export function validatePart(part){return validateProposal({projectName:'Draft',summary:'',enclosure:{width:120,height:50,depth:100},parts:[part],connections:[],questions:[],sources:[]}).parts[0];}
