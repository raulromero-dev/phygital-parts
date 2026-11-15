import { partStream } from './part-stream.mjs';
// Read Responses SSE without exposing model text, reasoning, queries or keys.
// Emit only validated complete parts, phases and completed-search counts.
export async function readResearchStream(body, onProgress) {
 const reader=body.getReader(),decoder=new TextDecoder(),searches=new Set();
 let buffer='',lastPhase='',lastCount=-1;const parts=partStream(part=>onProgress({type:'part',part}));
 const progress=phase=>{if(phase!==lastPhase||searches.size!==lastCount){lastPhase=phase;lastCount=searches.size;onProgress({phase,searches:searches.size});}};
 try {
  while(true){
   const {value,done}=await reader.read();
   buffer+=decoder.decode(value,{stream:!done});
   if(buffer.length>4000000)throw Error('Research stream exceeded limit');
   let boundary;
   while((boundary=buffer.match(/\r?\n\r?\n/))){
    const frame=buffer.slice(0,boundary.index);buffer=buffer.slice(boundary.index+boundary[0].length);
    const raw=frame.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!raw||raw==='[DONE]')continue;
    const event=JSON.parse(raw);
    if(event.type==='response.created'||event.type==='response.in_progress')progress('research');
    if(event.type==='response.web_search_call.in_progress'||event.type==='response.web_search_call.searching')progress('searching');
    if(event.type==='response.web_search_call.completed'){searches.add(event.item_id??event.output_index);progress('research');}
    if(event.type==='response.output_text.delta'){progress('drafting');if(typeof event.delta==='string')parts(event.delta);}
    if(event.type==='response.completed'){progress('checking');return event.response;}
    if(['response.failed','response.incomplete','error'].includes(event.type))throw Error('Research did not complete');
   }
   if(done)throw Error('Research stream ended before completion');
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
