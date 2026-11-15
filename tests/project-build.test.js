import test from 'node:test';
import assert from 'node:assert/strict';
import { partStream } from '../server/part-stream.mjs';
import { runProjectBuild, draftAssembly } from '../src/project-build.js';
import { emptyProject } from '../src/product-data.js';
import { validateState } from '../src/engine.js';
import { projectRoute, projectUrl } from '../src/routes.js';
import { normalizeVisual, validateRecipe } from '../src/model-data.js';
import { runModel } from '../server/model.mjs';
import { publicAddress, runAsset } from '../server/assets.mjs';
const key='sk-test_fixture_not_real_123456';
const part=k=>({key:k,catalogId:null,name:'Sensor '+k,kind:'board',dimensions:{width:20,height:5,depth:20,confidence:'estimate'},description:'A quote \\" and nested {"parts":[{}]} inside text',interface:'I2C',electrical:'Review',placement:'Verify',color:'#124567',position:[0,5,0],rotation:[0,0,0],purchaseLinks:[],sources:[],ports:[{id:'sda',label:'SDA',group:'J1',signal:'sda',rail:'3.3',anchor:[0,0,1]}]});
const proposal=parts=>({projectName:'Test project',summary:'Review before building',enclosure:{width:100,height:40,depth:80},parts,connections:[],questions:[],sources:[]});
const recipe={notes:'Only visible detail is modelled.',shapes:[{type:'box',size:[1,.2,1],position:[0,0,0],rotation:[0,0,0],color:'#124567',metalness:0,roughness:.5}]};
function appFixture(){let state=emptyProject();const snapshots=[],statuses=[];return {getState:()=>state,snapshots,statuses,startProject:()=>{state=emptyProject();},draft:s=>{state=validateState(s);snapshots.push(structuredClone(state));},model:(id,value)=>Object.assign(state.custom.find(p=>p.id===id),value),endBuild:s=>statuses.push(s),fit:()=>{}};}
const assistant=()=>{const events=[];return {events,beginBuild:()=>{},updateBuild:label=>events.push(label),buildPart:(key,name,status)=>events.push(status),finishBuild:label=>events.push(label)};};
const stream=events=>new Response(events.map(e=>JSON.stringify(e)+'\n').join(''),{headers:{'Content-Type':'application/x-ndjson'}});
test('partial JSON yields complete validated parts across every character boundary',()=>{
 const found=[],receive=partStream(p=>found.push(p));const raw=JSON.stringify(proposal([part('one'),part('two')]));
 for(const ch of raw)receive(ch);assert.deepEqual(found.map(p=>p.key),['one','two']);
 assert.throws(()=>partStream(()=>{})(JSON.stringify(proposal([{...part('bad'),dimensions:{width:-1,height:3,depth:4}}]))));
 const duplicates=partStream(()=>{});assert.throws(()=>duplicates(JSON.stringify(proposal([part('one'),part('one')]))),/Duplicate/);
});
test('project routes isolate generated builds and preserve existing examples',()=>{
 const id='build-12345678-1234-1234-1234-123456789abc';assert.deepEqual(projectRoute(projectUrl(id)),{id,key:id,generated:true});assert.equal(projectRoute('/projects/other'),null);assert.equal(projectRoute('/examples/air-monitor').id,'air-monitor');
});
test('draft reconciliation preserves IDs, image models and final cable endpoints',()=>{
 const ids=new Map(),one=part('one'),two=part('two');let first=draftAssembly(emptyProject(),proposal([one]),ids);for(const e of first.ids)ids.set(...e);
 first.state.custom[0].visual={type:'image',recipe};const final=proposal([one,two]);final.connections=[{fromPart:'one',fromPort:'sda',toPart:'two',toPort:'sda',type:'Hook-up wire',bundle:'I2C',note:'Verify'}];
 const result=draftAssembly(first.state,final,ids),clean=validateState(result.state);assert.equal(clean.custom[0].id,first.state.custom[0].id);assert.deepEqual(clean.custom[0].visual.recipe,recipe);assert.equal(clean.connections[0].from,clean.custom[0].id+':sda');
});
test('build adds parts before final response and retains models without changing IDs',async()=>{
 const app=appFixture(),chat=assistant(),p=proposal([part('one'),part('two')]);
 const events=p.parts.map(part=>({type:'part',part}));events.push({type:'result',data:{proposal:p}});
 await runProjectBuild({app,assistant:chat,request:{prompt:'Sensors',images:[]},getKey:()=>key,controller:new AbortController(),fetchImpl:async()=>stream(events),modelImpl:async()=>({visual:{type:'image',recipe},modelNote:'Image approximation'})});
 assert.equal(app.snapshots[0].instances.length,1);assert.equal(app.getState().instances.length,2);assert.equal(app.getState().custom.filter(p=>p.visual).length,2);assert.deepEqual(app.statuses,['complete']);assert.ok(chat.events.includes('Image approximation'));
});
test('failed or stopped research retains draft parts and does not claim completion',async()=>{
 for(const stop of [false,true]){
  const app=appFixture(),controller=new AbortController(),chat=assistant();
  await runProjectBuild({app,assistant:chat,request:{prompt:'Sensor'},getKey:()=>key,controller,fetchImpl:async()=>stream([{type:'part',part:part('one')},{type:'error',error:'Interrupted source'}]),modelImpl:async()=>{if(stop)controller.abort();return {modelNote:'Envelope'};}});
  assert.equal(app.getState().instances.length,1);assert.equal(app.statuses[0],stop?'interrupted':'error');assert.match(chat.events.at(-2),/draft parts are saved/);
 }
});
test('image model requires an actual image and sends it to Astra without storing it',async()=>{
 let payload;const body={part:{name:'Sensor',dimensions:[20,5,20],kind:'board'},image:'data:image/png;base64,AAAA'};
 const result=await runModel(body,key,async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(recipe)}]}]})};});
 assert.equal(result.status,200);assert.equal(payload.store,false);assert.equal(payload.model,'gpt-6-astra');assert.equal(payload.input[0].content[1].image_url,body.image);assert.equal(JSON.stringify(result).includes('base64'),false);
 assert.equal((await runModel({part:body.part},key,()=>{throw Error('Must not call provider');})).status,422);
});
test('CAD proxy blocks private ranges and rejects non-CAD responses; geometry is bounded',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.2','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','224.0.0.1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
 assert.equal((await runAsset({url:'https://example.com/a.step',format:'step'},'',null,null,async()=>({bytes:Buffer.from('<html>not a CAD file</html>')}))).status,422);
 assert.throws(()=>validateRecipe({...recipe,shapes:[{...recipe.shapes[0],size:[1000,1,1]}]}));
 assert.throws(()=>normalizeVisual({type:'image',recipe:{...recipe,shapes:Array(129).fill(recipe.shapes[0])}}));assert.equal(normalizeVisual({type:'cad',url:'file:///etc/passwd'}),undefined);
});
test('a sourced product image is downloaded and included in the vision request',async()=>{
 const image=Buffer.from([137,80,78,71,13,10,26,10]);let payload,source;
 const result=await runModel({part:{name:'Sensor',dimensions:[20,5,20],model:{imageUrl:'https://example.com/part.png',imageSourceUrl:'https://example.com/part'}}},key,async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(recipe)}]}]})};},undefined,undefined,async url=>{source=url;return {bytes:image};});
 assert.equal(result.status,200);assert.equal(source,'https://example.com/part.png');assert.equal(payload.input[0].content[1].image_url,'data:image/png;base64,'+image.toString('base64'));assert.equal(result.body.visual.sourceUrl,'https://example.com/part');
});
test('canceling key connection keeps the new workspace without contacting a provider',async()=>{
 const app=appFixture(),chat=assistant();let called=false;
 await runProjectBuild({app,assistant:chat,request:{prompt:'Sensor'},getKey:()=>'',ensureKey:async()=>false,controller:new AbortController(),fetchImpl:async()=>{called=true;}});
 assert.equal(called,false);assert.equal(app.getState().instances.length,0);assert.deepEqual(app.statuses,['error']);assert.ok(chat.events.some(x=>x.includes('Connect a key')));
});
test('multiple part models are prepared with at most two simultaneous requests',async()=>{
 const app=appFixture(),chat=assistant(),p=proposal(['a','b','c','d','e'].map(part));let count=0,max=0;
 await runProjectBuild({app,assistant:chat,request:{prompt:'Sensors'},getKey:()=>key,controller:new AbortController(),fetchImpl:async()=>stream([...p.parts.map(part=>({type:'part',part})),{type:'result',data:{proposal:p}}]),modelImpl:async()=>{count++;max=Math.max(max,count);await new Promise(resolve=>setTimeout(resolve,1));count--;return {modelNote:'No image available.'};}});
 assert.equal(max,2);assert.equal(app.getState().instances.length,5);assert.deepEqual(app.statuses,['complete']);
});
