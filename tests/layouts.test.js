import test from 'node:test';
import assert from 'node:assert/strict';
import { exampleTemplate } from '../src/templates.js';
import { validateState } from '../src/engine.js';
import { addLayouts, switchLayout, renameLayout, removeLayout, layoutDocument } from '../src/layouts.js';
import { applyAdjustments, validateAdjustment } from '../src/adjustments.js';
import { readSharedDocument } from '../src/sharing.js';
import { prepareAdjustment, runAdjustment } from '../server/adjust.mjs';
const base=()=>exampleTemplate('air-monitor');
const action=x=>({partId:'grove-scd41',position:[x,14,0],rotation:null,dimensions:null,note:null});
const alternative=(name,x)=>({name,description:'Placement study',changes:[action(x)],enclosure:null});
const proposal=(...layouts)=>({message:'Explore these layouts.',changes:[],enclosure:null,layouts});
const sensor=s=>s.instances.find(i=>i.id==='grove-scd41');
test('parallel proposals preserve the original and create independent complete layouts',()=>{
 const source=base(),before=structuredClone(source),next=applyAdjustments(source,proposal(alternative('Left',-35),alternative('Right',35)));
 assert.deepEqual(source,before);assert.deepEqual(layoutDocument(next),validateState(source));
 assert.equal(next.layouts.variants.length,3);
 const [original,left,right]=next.layouts.variants;
 assert.deepEqual(sensor(left.document).position,[-35,14,0]);assert.deepEqual(sensor(right.document).position,[35,14,0]);
 let active=switchLayout(next,left.id);sensor(active).position[0]=-40;active.notes.push({part:'grove-scd41',text:'Only left',at:new Date().toISOString()});active.connections=[];
 active=switchLayout(active,right.id);assert.deepEqual(sensor(active).position,[35,14,0]);assert.deepEqual(active.connections,before.connections);assert.ok(!active.notes.some(n=>n.text==='Only left'));
 active=switchLayout(validateState(JSON.parse(JSON.stringify(active))),left.id);assert.equal(sensor(active).position[0],-40);assert.equal(active.connections.length,0);assert.ok(active.notes.some(n=>n.text==='Only left'));
 assert.deepEqual(layoutDocument(switchLayout(active,original.id)),validateState(source));
});
test('ordinary edits and serialized reloads keep the active alternative up to date',()=>{
 let next=addLayouts(base(),[{name:'Another',document:base()}]);next=switchLayout(next,next.layouts.variants[1].id);
 next=applyAdjustments(next,{message:'Move',changes:[action(44)],enclosure:null});
 const reloaded=validateState(JSON.parse(JSON.stringify(next)));assert.equal(sensor(reloaded.layouts.variants[1].document).position[0],44);
 const renamed=renameLayout(reloaded,reloaded.layouts.activeId,'Renamed');assert.equal(renamed.layouts.variants[1].name,'Renamed');assert.equal(reloaded.layouts.variants[1].name,'Another');
 const removed=removeLayout(renamed,renamed.layouts.activeId);assert.equal(removed.layouts.variants.length,1);assert.deepEqual(sensor(removed).position,sensor(base()).position);assert.throws(()=>removeLayout(removed,removed.layouts.activeId));
});
test('invalid, mixed and overflowing alternatives fail without changing the current project',()=>{
 const state=base(),before=structuredClone(state);
 assert.throws(()=>applyAdjustments(state,proposal(alternative('Valid',20),{...alternative('Bad',30),changes:[{...action(30),partId:'missing'}]})));
 assert.throws(()=>validateAdjustment({...proposal(alternative('One',20)),changes:[action(10)]},state.instances.map(i=>i.id)),/separate/);
 assert.throws(()=>applyAdjustments(state,proposal(alternative('Same',20),alternative('same',30))),/Invalid layout/);
 assert.throws(()=>applyAdjustments(state,proposal({...alternative('Nested',20),layouts:[]})),/Invalid layout/);
 let group=addLayouts(state,Array.from({length:4},(_,i)=>({name:'Option '+i,document:state})));
 group=addLayouts(group,Array.from({length:3},(_,i)=>({name:'More '+i,document:state})));
 assert.equal(group.layouts.variants.length,8);assert.throws(()=>addLayouts(group,[{name:'Overflow',document:state}]),/eight/);
 for(const mutate of [s=>s.layouts.activeId='missing',s=>s.layouts.variants[1].id=s.layouts.variants[0].id,s=>s.layouts.variants[1].document.layouts=s.layouts]){
  const corrupt=structuredClone(group);mutate(corrupt);assert.throws(()=>validateState(corrupt));
 }
 assert.deepEqual(state,before);
});
test('each alternative resolves its own addition aliases and keeps mounted core checks',()=>{
 const state=base(),add={key:'new-sensor',sourceId:'grove-scd41',position:[40,10,0],rotation:[0,0,0]};
 const one={...alternative('One',20),additions:[add]},two={...alternative('Two',30),additions:[{...add,position:[-40,10,0]}]};
 const next=applyAdjustments(state,proposal(one,two)),[a,b]=next.layouts.variants.slice(1).map(v=>v.document);
 assert.equal(a.instances.length,state.instances.length+1);assert.equal(b.instances.length,state.instances.length+1);
 assert.notEqual(a.instances.at(-1).id,b.instances.at(-1).id);assert.deepEqual(a.instances.at(-1).position,[40,10,0]);assert.deepEqual(b.instances.at(-1).position,[-40,10,0]);
 assert.throws(()=>applyAdjustments(state,proposal({...alternative('Unseat XIAO',20),changes:[{...action(20),partId:'xiao'}]})),/attached/);
});
test('sharing exposes only the active assembly, never private alternatives',()=>{
 const state=applyAdjustments(base(),proposal(alternative('Private experiment',30))),active=switchLayout(state,state.layouts.variants[1].id);
 active.notes.push({part:'grove-scd41',text:'Private',at:new Date().toISOString()});
 const shared=readSharedDocument(active);assert.equal(shared.layouts,undefined);assert.deepEqual(shared.instances,active.instances);assert.deepEqual(shared.notes,[]);assert.ok(active.layouts);
});
test('API supports reviewed layout proposals from the same base with a bounded schema',async()=>{
 const context={parts:base().instances,layouts:{activeId:'layout-original',variants:[{id:'layout-original',name:'Original'}]}},request={prompt:'Explore two layouts',context};
 const prepared=prepareAdjustment(request);assert.equal(prepared.text.format.schema.properties.layouts.maxItems,4);assert.match(prepared.instructions,/same current assembly/);
 const body=proposal(alternative('Left',-30),alternative('Right',30));
 const result=await runAdjustment(request,'sk-test12345678901234567890',async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body)}]}]})}));
 assert.equal(result.status,200);assert.equal(result.body.proposal.layouts.length,2);assert.equal(applyAdjustments(base(),result.body.proposal).layouts.variants.length,3);
});
