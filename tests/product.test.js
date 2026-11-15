import { connectionIssues } from '../src/connections.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProject, libraryPart, applyProposal, safeUrl, linksFor } from '../src/product-data.js';
import { validateState, checks } from '../src/engine.js';
import { prepareRequest, runResearch, MODEL } from '../server/research.mjs';
import { validateProposal, publicUrl } from '../server/schema.mjs';
const part=(key)=>({key,catalogId:null,name:'CO2 sensor',kind:'board',dimensions:{width:25,height:8,depth:30,confidence:'estimate'},description:'Illustrative test part',interface:'I2C',electrical:'Verify voltage',placement:'Keep vent open',color:'#124567',position:[0,7,0],rotation:[0,0,0],purchaseLinks:[{label:'Product',url:'https://example.com/product'}],sources:[{label:'Documentation',url:'https://example.com/docs'}],ports:[{id:'sda',label:'SDA',signal:'sda',rail:'3.3',group:'Header',anchor:[-1,0,.5]}]});
const proposal=()=>({projectName:'Air monitor',summary:'Plan to review',enclosure:{width:120,height:50,depth:100},parts:[part('sensor')],connections:[],questions:['Confirm exact dimensions'],sources:[]});
test('generic blank project has no XIAO or antenna requirements',()=>{
 const state=validateState(emptyProject());assert.equal(state.instances.length,0);assert.equal(state.connections.length,0);assert.equal(checks(state).some(c=>/Controller missing|antenna missing/.test(c.title)),false);
});
test('repeated library parts reuse exact CAD and retain contacts after export/import',()=>{
 const s=emptyProject();libraryPart(s,'xiao');const id=libraryPart(s,'xiao');const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.instances.length,2);assert.equal(restored.custom[0].modelId,'xiao');assert.equal(restored.custom[0].id,id);assert.ok(restored.custom[0].ports.some(p=>p.id==='bat+'));assert.notDeepEqual(restored.instances[0].position,restored.instances[1].position);
});
test('AI proposal retains source links, dimensions, color and contact geometry on reload',()=>{
 const applied=applyProposal(emptyProject(),proposal(),['sensor'],{replace:true});const restored=validateState(JSON.parse(JSON.stringify(applied.state)));
 assert.equal(restored.name,'Air monitor');assert.equal(restored.custom[0].purchaseLinks[0][1],'https://example.com/product');assert.equal(restored.custom[0].color,'#124567');assert.deepEqual(restored.custom[0].ports[0].anchor,[-1,0,.5]);assert.equal(restored.custom[0].ports[0].rail,'3.3');assert.equal(restored.research.questions.length,1);
});
test('deselected AI parts and their conductors are not added',()=>{
 const p=proposal();p.parts.push(part('second'));p.connections.push({fromPart:'sensor',fromPort:'sda',toPart:'second',toPort:'sda',type:'Hook-up wire',bundle:'I2C',note:'Verify'});
 const one=applyProposal(emptyProject(),p,['sensor'],{replace:true}).state;assert.equal(one.connections.length,0);
 const both=validateState(applyProposal(emptyProject(),p,['sensor','second'],{replace:true}).state);assert.equal(both.connections.length,1);assert.equal(both.connections[0].status,'Planned');
});
test('imports strip executable links, arbitrary models and secrets',()=>{
 const s=applyProposal(emptyProject(),proposal(),['sensor'],{replace:true}).state;s.custom[0].purchaseLinks.push(['Bad','javascript:alert(1)']);s.custom[0].modelId='../../private';s.apiKey='secret';s.custom[0].apiKey='secret';
 const clean=validateState(s);assert.equal(clean.custom[0].purchaseLinks.length,1);assert.equal(clean.custom[0].modelId,undefined);assert.equal(JSON.stringify(clean).includes('secret'),false);assert.equal(safeUrl('javascript:alert(1)'),null);
});
test('purchase buttons exclude source-code and schematic links',()=>{
 assert.deepEqual(linksFor({name:'Test',links:[['Buy','https://example.com/product'],['Official CAD','https://github.com/vendor/part']]}),[['Buy','https://example.com/product']]);
});
test('Astra request preserves image and public-link inputs with strict outputs and no storage',()=>{
 const p=prepareRequest({mode:'project',prompt:'Plan an air sensor',links:['https://example.com/project'],images:['data:image/png;base64,AAAA'],catalog:[]});assert.equal(p.model,MODEL);assert.equal(p.store,false);assert.equal(p.tools[0].type,'web_search');assert.equal(p.text.format.strict,true);assert.equal(p.input[0].content[1].type,'input_image');assert.ok(p.input[0].content[0].text.includes('https://example.com/project'));
});
test('research rejects internal links, oversized inputs and invalid geometry',()=>{
 assert.equal(publicUrl('http://127.0.0.1/'),null);assert.equal(publicUrl('http://169.254.169.254/'),null);assert.equal(publicUrl('https://user:pass@example.com'),null);
 assert.throws(()=>prepareRequest({mode:'link',prompt:'Find',links:['file:///etc/passwd']}));assert.throws(()=>prepareRequest({mode:'project',prompt:'x'.repeat(8001)}));const p=proposal();p.parts[0].dimensions.width=-1;assert.throws(()=>validateProposal(p));
});
test('missing key never calls OpenAI; provider errors and refusals do not produce parts',async()=>{
 let called=false;const fn=async()=>{called=true;};assert.equal((await runResearch({},'',fn)).status,401);assert.equal(called,false);
 const key='sk-test_key_not_a_secret_1234',body={mode:'project',prompt:'Build a sensor'};
 assert.equal((await runResearch(body,key,async()=>({ok:false,status:429}))).status,429);
 const refusal=await runResearch(body,key,async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]})}));assert.equal(refusal.status,422);
});
test('successful mocked Responses result returns validated proposal and cited sources',async()=>{
 let payload;const result=await runResearch({mode:'project',prompt:'Build a sensor'},'sk-test_key_not_a_secret_1234',async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'web_search_call',action:{sources:[{title:'Product',url:'https://example.com/product'}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal())}]}],usage:{input_tokens:100,output_tokens:200}})};});
 assert.equal(result.status,200);assert.equal(result.body.proposal.parts.length,1);assert.equal(result.body.proposal.sources[0].url,'https://example.com/product');assert.equal(payload.model,'gpt-6-astra');
});

test('standalone XIAO does not reserve the absent carrier peripherals',()=>{
 const state=emptyProject();libraryPart(state,'xiao');libraryPart(state,'motor');
 const issues=connectionIssues(state,{id:'test',from:'xiao:d1',to:'motor:positive',type:'Hook-up wire',bundle:'Test',length:50,color:'#666666',status:'Planned',note:''});
 assert.equal(issues.some(s=>s.includes('onboard button')),false);assert.equal(issues.some(s=>s.includes('motor')),true);
});
