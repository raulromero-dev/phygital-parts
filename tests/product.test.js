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

test('smartwatch starter survives export/import with its complete header map',async()=>{
 const {smartwatchTemplate}=await import('../src/templates.js');const {endpoint,harnesses,cableDescription}=await import('../src/connections.js');
 const s=validateState(JSON.parse(JSON.stringify(smartwatchTemplate())));
 assert.equal(s.instances.length,4);assert.equal(s.connections.length,15);assert.equal(s.preset,'smartwatch');assert.equal(s.lockCore,false);
 for(const c of s.connections){assert.ok(endpoint(s,c.from));assert.ok(endpoint(s,c.to));assert.equal(c.status,'Planned');}
 const headers=harnesses(s).find(h=>h.type==='Board-to-board headers');assert.equal(headers.connections.length,14);assert.match(cableDescription(headers),/not separate cables/);
 assert.match(cableDescription(harnesses(s).find(h=>h.name==='Included antenna coax')),/No RP-SMA/);
 assert.equal(checks(s).some(c=>c.type==='Fit'&&c.level==='warn'),false);
});
test('watch battery stays unconnected and on hold until its adapter is reviewed',async()=>{
 const {smartwatchTemplate}=await import('../src/templates.js');const s=smartwatchTemplate();
 assert.equal(s.decisions['watch-round-battery'],'Hold');assert.equal(s.connections.some(c=>(c.from+c.to).includes('watch-round-battery:')),false);
 assert.ok(checks(s).some(c=>c.title==='Round battery charging mismatch'));assert.ok(checks(s).some(c=>c.title==='Watch pin allocation'));
});
test('watch header pin assignments agree with original Seeed v1.1 board nets',async()=>{
 const {readFileSync}=await import('node:fs');const {WATCH_SIGNALS}=await import('../src/smartwatch.js');
 const brd=readFileSync(new URL('../blender/vendor/round-display/round-display-v1.1.brd',import.meta.url),'utf8');
 const netNames={d0:'A0/BAT',d1:'D1/LCD_CS',d2:'D2/SD_CS',d3:'D3/LCD_DC',d4:'D4/SDA',d5:'D5/SCL',d6:'D6/TX',d7:'D7/TP_INT',d8:'D8/SCK',d9:'D9/MISO',d10:'D10/MOSI','5v':'USB_5V',gnd:'GND','3v3':'XIAO_3V3'};
 for(const [id,, ,side,pin] of WATCH_SIGNALS){const block=brd.split(`<signal name="${netNames[id]}">`)[1]?.split('</signal>')[0];assert.ok(block?.includes(`<contactref element="${side?'J4':'J5'}" pad="${pin}"`),id);}
});
test('watch components can be duplicated and retain their visualization and contacts',async()=>{
 const {smartwatchTemplate}=await import('../src/templates.js');const s=smartwatchTemplate();const id=libraryPart(s,'watch-display');const clean=validateState(s);const copy=clean.custom.find(p=>p.id===id);
 assert.equal(copy.modelId,'watch-display');assert.equal(copy.ports.length,16);assert.match(copy.purchaseLinks[0][1],/seeedstudio/);
});

test('round battery starter uses a dedicated model and an explicit charging warning',async()=>{
 const {smartwatchTemplate}=await import('../src/templates.js');const {PARTS}=await import('../src/catalog.js');const s=validateState(smartwatchTemplate());const p=PARTS['watch-round-battery'];
 assert.deepEqual(s.instances.find(i=>i.id===p.id).dimensions,[35,5.5,32]);assert.equal(p.modelId,undefined);assert.match(p.electrical,/300 mA/);assert.match(p.electrical,/485 mA/);
 assert.equal(checks(s).some(c=>c.level==='warn'&&c.title==='Round battery charging mismatch'),true);assert.equal(s.connections.some(c=>/watch-round-battery:/.test(c.from+c.to)),false);
});
test('refreshing an untouched watch starter upgrades its battery without overwriting edits',async()=>{
 const {smartwatchTemplate,upgradeWatchBattery}=await import('../src/templates.js');
 const old=()=>{const s=smartwatchTemplate();const p=s.instances.find(i=>i.id==='watch-round-battery');Object.assign(p,{id:'watch-battery',dimensions:[29,4.75,36],position:[0,3.375,4]});delete s.decisions['watch-round-battery'];s.decisions['watch-battery']='Hold';return s;};
 const s=old();assert.equal(upgradeWatchBattery(s),true);assert.ok(validateState(s).instances.some(p=>p.id==='watch-round-battery'));assert.equal(upgradeWatchBattery(s),false);
 const moved=old();moved.instances[0].position[0]=4;assert.equal(upgradeWatchBattery(moved),false);
 const wired=old();wired.connections.push({from:'watch-battery:positive',to:'watch-display:bat+'});assert.equal(upgradeWatchBattery(wired),false);
 const approved=old();approved.decisions['watch-battery']='Approve';assert.equal(upgradeWatchBattery(approved),false);
});

import { EXAMPLES, exampleTemplate } from '../src/templates.js';
import { endpoint, activeConnections } from '../src/connections.js';
import { readFileSync } from 'node:fs';
test('all four prebuilt examples round-trip with active mapped connections and no envelope collisions',()=>{
 assert.deepEqual(EXAMPLES.map(e=>e.id),['thermal-camera','air-monitor','wearable-haptics','smartwatch']);
 for(const example of EXAMPLES){
  const state=validateState(JSON.parse(JSON.stringify(exampleTemplate(example.id))));
  assert.ok(state.instances.length>=4);assert.ok(state.connections.length>=5);
  assert.equal(activeConnections(state).length,state.connections.length);
  assert.equal(checks(state).filter(c=>c.type==='Fit'&&c.level==='warn').length,0,example.id);
  for(const c of state.connections){assert.ok(endpoint(state,c.from));assert.ok(endpoint(state,c.to));assert.equal(c.status,'Planned');}
 }
 assert.throws(()=>exampleTemplate('missing'));
});
test('air monitor maps the manufacturer Grove netlist and has no invented battery path',()=>{
 const state=exampleTemplate('air-monitor'),board=readFileSync(new URL('../blender/vendor/scd41/scd41.brd',import.meta.url),'utf8');
 for(const [pin,contact]of [['scl',1],['sda',2],['vcc',3],['gnd',4]]){
  const net=[...board.matchAll(/<signal name="([^"]+)"[^>]*>([\s\S]*?)<\/signal>/g)].find(m=>m[2].includes(`<contactref element="J1" pad="${contact}"/>`));
  assert.equal(net[1].toLowerCase(),pin);
  assert.ok(state.connections.some(c=>c.from==='expansion:i2c1-'+pin&&c.to==='grove-scd41:'+pin));
 }
 assert.equal(state.instances.some(p=>p.id==='battery'),false);
});
test('wearable haptics preserve four independent channels and power-budget review',()=>{
 const state=exampleTemplate('wearable-haptics');
 for(let n=1;n<=4;n++)for(const pin of ['scl','sda','vcc','gnd'])assert.ok(state.connections.some(c=>c.from===`haptic-hub:ch${n-1}-${pin}`&&c.to===`grove-haptic-${n}:${pin}`));
 assert.ok(checks(state).some(c=>/power and fit check/.test(c.title)));
 const a=exampleTemplate('air-monitor');a.instances[0].position[0]=999;
 assert.notEqual(exampleTemplate('air-monitor').instances[0].position[0],999);
});
