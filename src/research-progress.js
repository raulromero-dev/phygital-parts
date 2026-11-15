export const RESEARCH_PHASES={research:'Researching your idea…',searching:'Searching component sources…',drafting:'Preparing your assembly proposal…',checking:'Checking the proposal…'};

export async function readResearchResponse(response,onProgress){
 if(!response.headers.get('content-type')?.includes('application/x-ndjson')){
  const data=await response.json();if(!response.ok)throw Error(data.error||'Research could not finish.');return data;
 }
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
 function parse(line){
  const event=JSON.parse(line);
  if(event.type==='progress'&&RESEARCH_PHASES[event.phase])onProgress({phase:event.phase,searches:Math.min(8,Math.max(0,Number(event.searches)||0))});
  if(event.type==='error')throw Error(event.error||'Research could not finish.');
  if(event.type==='result')return event.data;
 }
 try{
  while(true){
   const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});
   if(buffer.length>4000000)throw Error('Research result is too large.');
   let newline;
   while((newline=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(line.trim()){const result=parse(line);if(result)return result;}}
   if(done){if(buffer.trim()){const result=parse(buffer);if(result)return result;}throw Error('Connection ended before research finished. Please try again.');}
  }
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
