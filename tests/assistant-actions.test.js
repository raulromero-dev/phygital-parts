import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAdjustments,validateAdjustment} from '../src/adjustments.js';
import {cleanChat,conversationText} from '../src/chat-data.js';
import {phygitalTemplate} from '../src/templates.js';
import {addCrowPanel} from '../src/planning.js';
import {portsFor} from '../src/connections.js';
import {prepareAdjustment} from '../server/adjust.mjs';
const blank=()=>({message:'Review these additions.',changes:[],enclosure:null,additions:[],removals:[],connections:[],removeConnections:[],question:null});
const add=(key,sourceId,position=[0,12,0])=>({key,sourceId,position,rotation:[0,0,0]});
const wire=(fromPart,fromPort,toPart,toPort)=>({fromPart,fromPort,toPart,toPort,type:'JST PH 2.0 mm',bundle:'Battery cable',length:80,color:'#cc2222',note:'Verify polarity.'});
test('duplicates reuse CAD, measured dimensions and contact maps; a planned cable resolves aliases',()=>{
 const state=phygitalTemplate('wide');addCrowPanel(state);state.instances.find(p=>p.id==='battery').dimensions=[56,5,74];const before=structuredClone(state);
 const p={...blank(),additions:[add('new-battery','battery'),add('new-camera','thermal'),add('new-haptic','grove-haptic-1'),add('new-hub','haptic-hub')],connections:[wire('new-battery','positive','crowpanel-advance-28','j10-1')]};
 const next=applyAdjustments(state,p);assert.deepEqual(state,before);assert.equal(next.instances.length,state.instances.length+4);
 const battery=next.custom.find(p=>p.modelId==='battery');assert.ok(battery);assert.deepEqual(next.instances.find(p=>p.id===battery.id).dimensions,[56,5,74]);assert.deepEqual(portsFor(next,battery.id),portsFor(state,'battery'));
 assert.equal(next.connections.at(-1).from,battery.id+':positive');assert.equal(next.connections.at(-1).status,'Planned');
 const camera=next.custom.find(p=>p.modelId==='thermal');assert.ok(camera);assert.ok(next.instances.find(p=>p.id==='grove-haptic-1'));
 const duplicate=applyAdjustments(next,{...blank(),additions:[add('new-again',camera.id)]});assert.equal(duplicate.custom.at(-1).modelId,'thermal');
});
test('invalid aliases, absent contacts and unsafe power connections fail without partial mutation',()=>{
 const state=phygitalTemplate('wide'),before=structuredClone(state);
 for(const p of [{...blank(),additions:[add('new-one','imaginary')]},{...blank(),connections:[wire('battery','positive','thermal','imaginary')]},{...blank(),connections:[wire('battery','positive','thermal','gnd')]},{...blank(),connections:[wire('battery','positive','thermal','sda')]}])assert.throws(()=>applyAdjustments(state,p));
 assert.deepEqual(state,before);
});
test('removing a component removes its incident cables and retains unrelated parts',()=>{
 const state=phygitalTemplate('wide'),next=applyAdjustments(state,{...blank(),removals:['thermal']});
 assert.ok(!next.instances.some(p=>p.id==='thermal'));assert.ok(!next.connections.some(c=>[c.from,c.to].some(s=>s.startsWith('thermal:'))));assert.ok(next.instances.some(p=>p.id==='battery'));
 assert.throws(()=>applyAdjustments(state,{...blank(),removals:['expansion']}),/mounted/);
});
test('questions offer bounded choices, preserve context and never mix unanswered questions with changes',()=>{
 const question={prompt:'Which board should drive the camera?',options:['CrowPanel','XIAO']},p={...blank(),question};assert.deepEqual(validateAdjustment(p,['battery']).question,question);
 assert.throws(()=>validateAdjustment({...p,question:{...question,options:['Yes','Yes']}},[]));assert.throws(()=>validateAdjustment({...p,additions:[add('new-one','battery')]},['battery']));
 const history=cleanChat([{role:'assistant',text:'Choose the controller.',question,target:'crowpanel-advance-28',secret:'sk-forbidden',answered:false}]);assert.equal(history[0].target,'crowpanel-advance-28');assert.equal(history[0].secret,undefined);assert.match(conversationText(history[0]),/CrowPanel \/ XIAO/);
 const request=prepareAdjustment({prompt:'Add another camera',context:{parts:phygitalTemplate('wide').instances}});assert.ok(request.text.format.schema.properties.question);assert.match(request.input[0].content[0].text,/grove-haptic-1/);
});
test('a single added haptic module has a one-module power budget',async()=>{
 const {planningIssues}=await import('../src/planning.js');const state=applyAdjustments(phygitalTemplate('wide'),{...blank(),additions:[add('new-haptic','grove-haptic-1')]});const power=planningIssues(state).find(i=>i.title==='Plug-in haptics need a power and fit check');assert.match(power.detail,/1 Grove Haptic Motor module:/);assert.match(power.detail,/0.75 W/);
});
