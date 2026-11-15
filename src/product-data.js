import { CATALOG, PARTS, defaultState } from './catalog.js';
import { PORTS } from './connections.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value){
  try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function linksFor(part){
  const direct=(part.purchaseLinks||part.links||[]).map(link=>Array.isArray(link)?link:[link.label,link.url]).filter(([label,url])=>safeUrl(url)&&!/(wiki|docs\.|\.pdf|datasheet|wiring|pinout|technical|guide|schematic|github\.com|\bCAD\b)/i.test(label+' '+url)).map(([label,url])=>[label.replace(/\s*·\s*\$[\d.]+(?: each)?/g,''),safeUrl(url)]);
  return direct.length?direct:[['Search Amazon','https://www.amazon.com/s?k='+encodeURIComponent(part.name)],['Search Micro Center','https://www.microcenter.com/search/search_results.aspx?Ntt='+encodeURIComponent(part.name)]];
}
export function purchaseHtml(part){
 return `<section class="purchase-panel"><div><strong>Buy</strong></div>${linksFor(part).map(([label,url])=>`<a class="purchase-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`).join('')}</section>`;
}
export const library=CATALOG.filter(p=>!['kit','motor-rail'].includes(p.id)&&!/^grove-haptic-[234]$|^mosfet-[234]$|^motor-[234]$/.test(p.id));
export function emptyProject(name='Untitled project'){
 const state=defaultState();return {...state,name,preset:'blank',instances:[],connections:[],custom:[],notes:[],decisions:{},lockCore:false,enclosure:[120,50,100],brief:'',projectLinks:[]};
}
export function nextPosition(state,dimensions){
 const [w,h,d]=dimensions,[ew,,ed]=state.enclosure,pad=4;
 const candidates=[[0,h/2+2,0]];
 for(let x=-ew/2+w/2+pad;x<=ew/2-w/2-pad;x+=w+pad)for(let z=-ed/2+d/2+pad;z<=ed/2-d/2-pad;z+=d+pad)candidates.push([x,h/2+2,z]);
 candidates.sort((a,b)=>Math.hypot(a[0],a[2])-Math.hypot(b[0],b[2]));
 const free=candidates.find(([x,y,z])=>Math.abs(x)+w/2<=ew/2&&Math.abs(z)+d/2<=ed/2&&state.instances.every(i=>Math.abs(x-i.position[0])>=(w+i.dimensions[0])/2+pad||Math.abs(z-i.position[2])>=(d+i.dimensions[2])/2+pad||Math.abs(y-i.position[1])>=(h+i.dimensions[1])/2+pad));
 // Keep overflow visible beside the case when no free footprint remains.
 return free||[ew/2+w/2+12,h/2+2,state.instances.length*5];
}
export function libraryPart(state,id){
 const source=PARTS[id];if(!source)throw Error('Part is not in the library.');
 if(!state.instances.some(p=>p.id===id)){
  state.instances.push({id,position:nextPosition(state,source.dimensions),rotation:[0,0,0],dimensions:[...source.dimensions]});return id;
 }
 const customId='custom-'+crypto.randomUUID();
 state.custom.push({...source,id:customId,name:source.name+' · copy',short:source.short+' · copy',modelId:source.modelId||source.id,ports:structuredClone(PORTS[id]||[]),sources:[],owned:false});
 state.instances.push({id:customId,position:nextPosition(state,source.dimensions),rotation:[0,0,0],dimensions:[...source.dimensions]});return customId;
}
export function applyProposal(state,proposal,keys,{replace=false}={}){
 const next=replace?emptyProject(proposal.projectName):structuredClone(state);
 if(replace){next.enclosure=[proposal.enclosure.width,proposal.enclosure.height,proposal.enclosure.depth];next.brief=proposal.summary;}
 const ids=new Map();let lastId,skippedConnections=0;
 for(const item of proposal.parts.filter(p=>keys.includes(p.key))){
  const known=PARTS[item.catalogId];
  const id=known?libraryPart(next,known.id):'custom-'+crypto.randomUUID();
  if(!known){
   const dimensions=[item.dimensions.width,item.dimensions.height,item.dimensions.depth];
   const p={id,name:item.name,short:item.name,category:'Custom',kind:item.kind,color:item.color,dimensions,owned:false,quantity:1,confidence:item.dimensions.confidence,dimensionNote:item.dimensions.confidence==='sourced'?'AI-extracted dimensions; confirm the source and delivered revision.':'Estimated planning envelope. Measure the real part before ordering an enclosure.',interface:item.interface,summary:item.description,placement:item.placement,electrical:item.electrical,ports:item.ports,sources:[],links:item.sources.map(s=>[s.label,s.url]),purchaseLinks:item.purchaseLinks.map(s=>[s.label,s.url]),photo:'AI research proposal',modelNote:'Parametric planning envelope, not manufacturer CAD. Contacts are approximate.',tags:['Review dimensions']};
   next.custom.push(p);next.instances.push({id,position:replace?item.position:nextPosition(next,dimensions),rotation:item.rotation,dimensions});
  }else if(replace){const instance=next.instances.find(p=>p.id===id);instance.position=[...item.position];instance.rotation=[...item.rotation];}
  ids.set(item.key,id);lastId=id;
 }
 for(const c of proposal.connections){
  const a=ids.get(c.fromPart),b=ids.get(c.toPart);if(!a||!b)continue;
  const ports=id=>PORTS[id]||next.custom.find(p=>p.id===id)?.ports||[];
  if(!ports(a).some(p=>p.id===c.fromPort)||!ports(b).some(p=>p.id===c.toPort)){skippedConnections++;continue;}
  next.connections.push({id:crypto.randomUUID(),from:a+':'+c.fromPort,to:b+':'+c.toPort,type:c.type,bundle:c.bundle,length:100,color:'#666666',status:'Planned',note:'AI proposal — verify pinout, supply and cable. '+c.note});
 }
 next.research={summary:proposal.summary,questions:[...proposal.questions,...(skippedConnections?[`${skippedConnections} proposed conductors were not added because their contacts could not be matched. Map them after reviewing the pinouts.`]:[])],sources:proposal.sources,at:new Date().toISOString()};
 return {state:next,selected:lastId,skippedConnections};
}
