import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAdjustments, validateAdjustment } from '../src/adjustments.js';
import { exampleTemplate, phygitalTemplate } from '../src/templates.js';
import { projectRoute, projectUrl } from '../src/routes.js';
import { defaultState } from '../src/catalog.js';
import { checks } from '../src/engine.js';
import { linksFor } from '../src/product-data.js';
import { RING_PARTS } from '../src/smart-ring.js';
import { prepareAdjustment, runAdjustment } from '../server/adjust.mjs';
const edit=(partId,position)=>({partId,position,rotation:null,dimensions:null,note:null});
const proposal=changes=>({message:'Move the selected part.',changes,enclosure:null});
const request=()=>({prompt:'Move this sensor up by 2 mm',selectedPartId:'grove-scd41',context:{parts:exampleTemplate('air-monitor').instances}});
test('starter routes use separate namespaces, including original layout variants',()=>{
 const paths=['phygital','smart-ring','smartwatch','thermal-camera','air-monitor','wearable-haptics','makeup-cyberdeck'].map(id=>projectUrl(id));
 const keys=paths.map(path=>projectRoute(path).key);assert.equal(new Set(keys).size,7);
 assert.equal(projectRoute(projectUrl('phygital','bench')).key,'phygital-bench');
 assert.notEqual(projectRoute(projectUrl('phygital','wide')).key,projectRoute(projectUrl('phygital')).key);
 assert.equal(projectRoute('/examples/unknown'),null);assert.equal(projectRoute('/smart-ring'),null);assert.throws(()=>projectUrl('unknown'));
});
test('original Phygital starters preserve the original geometry and antenna',()=>{
 for(const preset of ['compact','bench'])assert.deepEqual(phygitalTemplate(preset).instances,defaultState(preset).instances);
 const wide=phygitalTemplate('wide');assert.deepEqual(wide.instances.find(p=>p.id==='xiao').position,[34,16.5,-7]);assert.deepEqual(wide.enclosure,[150,38,122]);
});
test('smart ring has only its own CAD parts and keeps curved clearance under review',()=>{
 const ring=exampleTemplate('smart-ring');assert.equal(ring.instances.length,4);assert.ok(ring.instances.every(p=>p.id.startsWith('ring-')));
 assert.equal(ring.connections.length,2);assert.ok(ring.connections.every(c=>c.type==='Soldered battery tabs'));
 assert.ok(checks(ring).some(c=>c.level==='review'&&c.title.includes('clearance')));
 assert.match(linksFor(RING_PARTS.find(p=>p.id==='ring-board'))[0][0],/fabrication required/);
});
test('adjustments move only the requested part and leave the source untouched',()=>{
 const state=exampleTemplate('air-monitor'),before=structuredClone(state),next=applyAdjustments(state,proposal([edit('grove-scd41',[24,11,15])]));
 assert.deepEqual(state,before);assert.deepEqual(next.instances.find(p=>p.id==='grove-scd41').position,[24,11,15]);
 assert.deepEqual(next.instances.find(p=>p.id==='expansion'),state.instances.find(p=>p.id==='expansion'));
});
test('carrier adjustments retain the mounted XIAO and cannot move a locked child independently',()=>{
 const state=exampleTemplate('air-monitor');const next=applyAdjustments(state,proposal([edit('expansion',[0,10,0])]));
 assert.deepEqual(next.instances.find(p=>p.id==='xiao').position,[0,18.5,-17]);
 assert.throws(()=>applyAdjustments(state,proposal([edit('xiao',[0,10,0])])),/attached/);
});
test('invalid or unknown adjustments are rejected atomically',()=>{
 const state=exampleTemplate('air-monitor'),before=structuredClone(state);
 assert.throws(()=>applyAdjustments(state,proposal([edit('grove-scd41',[24,11,15]),edit('missing',[0,0,0])])));assert.deepEqual(state,before);
 assert.throws(()=>validateAdjustment(proposal([edit('grove-scd41',[NaN,0,0])]),['grove-scd41']));
 assert.throws(()=>validateAdjustment(proposal([{...edit('grove-scd41',null),dimensions:[-2,10,10]}]),['grove-scd41']));
});
test('assistant request carries selected-part context and conversation, with no storage or code tools',()=>{
 const r=prepareAdjustment({...request(),history:[{role:'user',text:'Keep the antenna clear.'}]});
 assert.equal(r.store,false);assert.equal(r.text.format.strict,true);assert.deepEqual(r.tools,[{type:'web_search'}]);
 assert.match(r.input[0].content[0].text,/selectedPartId.*grove-scd41/);assert.match(r.input[0].content[0].text,/Keep the antenna clear/);
 assert.throws(()=>prepareAdjustment({...request(),selectedPartId:'missing'}));
});
test('missing assistant key does not call OpenAI; successful mocked edits are validated',async()=>{
 let called=false;const no=await runAdjustment(request(),'',async()=>{called=true;});assert.equal(no.status,401);assert.equal(called,false);
 const key='sk-test12345678901234567890',body=proposal([edit('grove-scd41',[24,11,15])]);
 const yes=await runAdjustment(request(),key,async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body)}]}]})}));
 assert.equal(yes.status,200);assert.deepEqual(yes.body.proposal,body);assert.equal(JSON.stringify(yes).includes(key),false);
 const bad=await runAdjustment(request(),key,async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal([edit('missing',[0,0,0])]))}]}]})}));assert.equal(bad.status,502);
});
