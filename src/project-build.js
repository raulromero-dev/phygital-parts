import { applyProposal, emptyProject, library } from './product-data.js';
import { PORTS } from './connections.js';
import { validatePart, validateProposal } from '../server/schema.mjs';
import { readResearchResponse, RESEARCH_PHASES } from './research-progress.js';

export function draftAssembly(previous,proposal,identities){
 const result=applyProposal(emptyProject(),proposal,proposal.parts.map(p=>p.key),{replace:true,identities});
 for(const part of result.state.custom){const old=previous.custom.find(p=>p.id===part.id);if(old?.visual)part.visual=old.visual;if(old?.modelNote)part.modelNote=old.modelNote;}
 return result;
}

export async function runProjectBuild({app,assistant,request,getKey,ensureKey,controller,retry,fetchImpl=fetch,modelImpl=(...args)=>import('./part-models.js').then(m=>m.preparePartModel(...args))}){
 const signal=controller.signal,parts=new Map(),identities=new Map(),tasks=[],queue=[];let working=0,finalProposal=null,modelFailures=0;
 app.startProject();assistant.beginBuild(request.prompt,()=>controller.abort());
 const draft=()=>{
  const p=finalProposal||{projectName:'Your new project',summary:'Draft assembly in progress.',enclosure:{width:120,height:50,depth:100},parts:[...parts.values()],connections:[],questions:[],sources:[]};
  const next=draftAssembly(app.getState(),p,identities);for(const [key,id]of next.ids)identities.set(key,id);app.draft(next.state);
 };
 const pump=()=>{
  while(working<2&&queue.length){const job=queue.shift();working++;job().finally(()=>{working--;pump();});}
 };
 const add=raw=>{
  signal.throwIfAborted();const item=validatePart(raw);if(parts.has(item.key))return;
  parts.set(item.key,item);draft();app.fit();
  const id=identities.get(item.key),part=app.getState().custom.find(p=>p.id===id);
  if(!part||part.modelId){assistant.buildPart(item.key,item.name,'Catalog model');return;}
  assistant.buildPart(item.key,item.name,'Draft added · model queued');
  tasks.push(new Promise(resolve=>queue.push(async()=>{
   try{
    if(signal.aborted)return;
    const result=await modelImpl(part,getKey(),request.images?.[0],signal,status=>assistant.buildPart(item.key,item.name,status));
    if(signal.aborted)return;
    app.model(id,result);assistant.buildPart(item.key,item.name,result.visual?.type==='cad'?'Source CAD':result.visual?.type==='image'?'Image approximation':'Planning envelope');if(!result.visual)modelFailures++;
   }catch{if(!signal.aborted){modelFailures++;assistant.buildPart(item.key,item.name,'Planning envelope');}}
   finally{resolve();}
  })));pump();
 };
 try{
  if(!getKey()){assistant.updateBuild('Connect your key to start');if(!await ensureKey())throw Error('Connect a key to build this project.');}
  signal.throwIfAborted();assistant.updateBuild('Finding your parts…');
  const response=await fetchImpl('/api/research',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',Authorization:'Bearer '+getKey()},body:JSON.stringify({...request,context:null,catalog:library.map(p=>({id:p.id,name:p.name,dimensions:p.dimensions,interface:p.interface,ports:PORTS[p.id]||[]}))}),signal});
  const data=await readResearchResponse(response,({phase,searches})=>assistant.updateBuild(RESEARCH_PHASES[phase]+(searches?` · ${searches} searches`:'')),add);
  signal.throwIfAborted();finalProposal=validateProposal(data.proposal);
  for(const item of finalProposal.parts)add(item);
  draft();assistant.updateBuild(tasks.length?'Preparing component models…':'Checking connections…');await Promise.all(tasks);signal.throwIfAborted();
  app.endBuild('complete');app.fit();
  assistant.finishBuild(`${finalProposal.parts.length} parts added. ${modelFailures?`${modelFailures} use planning envelopes. `:''}Review fit and pinouts before building.${finalProposal.questions.length?' '+finalProposal.questions[0]:''}`);
  return data;
 }catch(error){
  const stopped=signal.aborted;controller.abort();await Promise.all(tasks);
  app.endBuild(stopped?'interrupted':'error');
  assistant.finishBuild(stopped?'Stopped. Your draft parts are saved.':error.message+' Your draft parts are saved.',retry);
 }finally{if(signal.aborted)for(const [key,item]of parts)assistant.buildPart(key,item.name,'Draft · review needed');}
}
