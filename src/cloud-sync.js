// Serialize writes and use the server revision. A failed/conflicting write keeps
// its newest draft available; no background retry may overwrite another tab.
export function createSaveQueue({revision,write,onStatus=()=>{},onSaved=()=>{}}){
 let pending=null,inFlight=null,stopped=false,error=null;
 async function run(){
  if(stopped||error||!pending)return;
  const value=pending;pending=null;onStatus('saving');
  try{const row=await write(value,revision);if(stopped)return;revision=row.revision;onSaved(row,value,!!pending);onStatus(pending?'saving':'saved');}
  catch(e){if(stopped)return;pending=pending||value;error=e;onStatus(/PROJECT_CONFLICT|23505/.test(e.message+' '+e.code)?'conflict':'offline');}
 }
 function flush(){if(stopped)return Promise.resolve();if(inFlight)return inFlight;inFlight=(async()=>{while(pending&&!error&&!stopped)await run();})().finally(()=>{inFlight=null;});return inFlight;}
 return {enqueue(value){if(stopped)return;pending=structuredClone(value);onStatus(error?(/PROJECT_CONFLICT|23505/.test(error.message+' '+error.code)?'conflict':'offline'):'saving');},flush,retry(){if(error&&/PROJECT_CONFLICT|23505/.test(error.message+' '+error.code))return Promise.resolve();error=null;return flush();},stop(){stopped=true;pending=null;},get dirty(){return !!pending||!!inFlight;},get revision(){return revision;}};
}
