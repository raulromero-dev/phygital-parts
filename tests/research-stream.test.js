import test from 'node:test';
import assert from 'node:assert/strict';
import { runResearch, handleNodeRequest } from '../server/research.mjs';
import { createServer } from 'node:http';
import { readResearchResponse } from '../src/research-progress.js';

const proposal={projectName:'Sensor study',summary:'Review the available specifications',enclosure:{width:100,height:40,depth:80},parts:[],connections:[],questions:['Which sensor revision?'],sources:[]};
const complete={type:'response.completed',response:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal)}]}]}};
const key='sk-test_key_not_a_secret_1234';
function chunked(text,type='text/event-stream'){
 const bytes=new TextEncoder().encode(text);let offset=0;
 return new Response(new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+=7));}}),{headers:{'Content-Type':type}});
}
const sse=events=>events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join('');
test('research streams actual phases and deduplicates searches without relaying model text',async()=>{
 const events=[{type:'response.created'},{type:'response.web_search_call.searching',item_id:'search1'},{type:'response.web_search_call.completed',item_id:'search1'},{type:'response.web_search_call.completed',item_id:'search1'},{type:'response.reasoning_summary_text.delta',delta:'private content'},{type:'response.output_text.delta',delta:'model output'},complete];
 const progress=[];let payload;
 const result=await runResearch({mode:'project',prompt:'A small sensor'},key,async(_url,options)=>{payload=JSON.parse(options.body);return chunked(sse(events));},undefined,event=>progress.push(event));
 assert.equal(payload.stream,true);assert.equal(payload.store,false);assert.equal(result.status,200);assert.deepEqual(result.body.proposal,proposal);
 assert.deepEqual(progress,[{phase:'research',searches:0},{phase:'searching',searches:0},{phase:'research',searches:1},{phase:'drafting',searches:1},{phase:'checking',searches:1}]);
 assert.ok(!JSON.stringify(progress).includes('private content'));
});
test('incomplete, malformed, refused or invalid streamed results never become a proposal',async()=>{
 for(const text of [sse([{type:'response.created'}]),'data: not-json\n\n',sse([{type:'response.incomplete'}]),sse([{type:'response.completed',response:{status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}}]),sse([{...complete,response:{...complete.response,output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]}}])]){
  const result=await runResearch({mode:'project',prompt:'Sensor'},key,async()=>chunked(text),undefined,()=>{});assert.ok(result.status>=400);assert.equal(result.body.proposal,undefined);
 }
});
test('browser progress parser handles split UTF-8 and delivers only the validated final result',async()=>{
 const progress=[],data={proposal:{...proposal,projectName:'CO₂ monitor'}};
 const response=chunked([{type:'progress',phase:'searching',searches:1},{type:'progress',phase:'unknown',text:'not a status'},{type:'result',data}].map(x=>JSON.stringify(x)).join('\n'),'application/x-ndjson');
 assert.deepEqual(await readResearchResponse(response,x=>progress.push(x)),data);assert.deepEqual(progress,[{phase:'searching',searches:1}]);
});
test('browser stream failures and JSON authentication errors stay actionable',async()=>{
 await assert.rejects(readResearchResponse(chunked('{"type":"error","error":"Try again"}\n','application/x-ndjson'),()=>{}),/Try again/);
 await assert.rejects(readResearchResponse(chunked('{"type":"progress","phase":"research"}\n','application/x-ndjson'),()=>{}),/Connection ended/);
 await assert.rejects(readResearchResponse(new Response('{"error":"Connect your key"}',{status:401,headers:{'Content-Type':'application/json'}}),()=>{}),/Connect your key/);
});
test('disconnect signal reaches the provider request and canceled research produces no proposal',async()=>{
 const abort=new AbortController();abort.abort();
 const result=await runResearch({mode:'project',prompt:'Sensor'},key,async(_url,options)=>{assert.equal(options.signal.aborted,true);options.signal.throwIfAborted();},abort.signal,()=>{});
 assert.ok(result.status>=400);assert.equal(result.body.proposal,undefined);
});
test('HTTP handler negotiates streamed progress and keeps pre-stream errors as JSON',async()=>{
 const originalFetch=globalThis.fetch;
 const server=createServer((req,res)=>handleNodeRequest(req,res));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/research`;
 try{
  globalThis.fetch=async()=>chunked(sse([{type:'response.created'},complete]));
  const response=await originalFetch(url,{method:'POST',headers:{Accept:'application/x-ndjson',Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({mode:'project',prompt:'Sensor'})});
  assert.equal(response.headers.get('content-type'),'application/x-ndjson');
  const phases=[];const data=await readResearchResponse(response,event=>phases.push(event.phase));assert.equal(data.proposal.projectName,proposal.projectName);assert.deepEqual(phases,['research','checking']);
  const unauthorized=await originalFetch(url,{method:'POST',headers:{Accept:'application/x-ndjson','Content-Type':'application/json'},body:JSON.stringify({mode:'project',prompt:'Sensor'})});
  assert.equal(unauthorized.status,401);assert.equal(unauthorized.headers.get('content-type'),'application/json');
 }finally{globalThis.fetch=originalFetch;await new Promise(resolve=>server.close(resolve));}
});
