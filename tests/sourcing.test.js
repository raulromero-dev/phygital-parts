import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSourcing, sourcingHtml, offerTiming } from '../src/sourcing.js';
import { verifiedSourcing, shoppingContext } from '../server/sourcing.mjs';
import { prepareAdjustment, runAdjustment } from '../server/adjust.mjs';
import { prepareRequest, runResearch } from '../server/research.mjs';
import { cleanChat, conversationText } from '../src/chat-data.js';
import { exampleTemplate } from '../src/templates.js';
const now=new Date('2026-11-16T15:00:00Z');
const offer=()=>({name:'Display <test>',sku:'LCD-42',retailer:'Retailer',url:'https://shop.example.com/product/lcd-42',price:'USD 24.99',match:'alternative',stock:'in_stock',fulfillment:'delivery',location:'02134',availableBy:'2026-11-17',evidence:'Retailer lists arrival November 17 for 02134.',evidenceUrl:'https://shop.example.com/product/lcd-42',compatibility:'SPI; review the connector and controller.'});
const report=()=>({location:'02134',deadline:'2026-11-18',notes:'Confirm at checkout.',offers:[offer()],checkedAt:now.toISOString()});
const result=(sourcing=report())=>({message:'Review these options.',changes:[],enclosure:null,sourcing});
const request=()=>({prompt:'Find alternatives for this part near 02134 within 2 days at Micro Center or Amazon.',selectedPartId:'grove-scd41',shoppingContext:{timeZone:'America/New_York'},context:{parts:exampleTemplate('air-monitor').instances}});
const provider=(payload,sources=[{url:offer().url}])=>({status:'completed',output:[{type:'web_search_call',action:{sources}},{type:'message',content:[{type:'output_text',text:JSON.stringify(payload)}]}]});
test('shopping clock uses server time in the visitor timezone without inferring their location',()=>{
 assert.deepEqual(shoppingContext({timeZone:'America/New_York',today:'1999-01-01'},new Date('2026-11-17T01:00:00Z')),{today:'2026-11-16',timeZone:'America/New_York',location:'',deadline:null});
 assert.equal(shoppingContext({timeZone:'invalid',deadline:'2026-02-31'},now).deadline,null);
 assert.equal(shoppingContext({timeZone:'invalid'},now).timeZone,'UTC');
});
test('chat and Find parts both receive web search, selected part, location timing and exact SKU constraints',()=>{
 const chat=prepareAdjustment(request()),research=prepareRequest({...request(),mode:'parts'});
 for(const r of [chat,research]){
  assert.deepEqual(r.tools,[{type:'web_search'}]);assert.equal(r.store,false);
  assert.match(r.instructions,/never infer a location/);assert.match(r.instructions,/do not silently substitute/);
  const input=JSON.parse(r.input[0].content[0].text);assert.equal(input.selectedPartId,'grove-scd41');assert.equal(input.shoppingContext.timeZone,'America/New_York');
 }
});
test('stock is distinct from ETA; missing provenance cannot masquerade as available in two days',()=>{
 const verified=verifiedSourcing(report(),provider(result()),now);assert.equal(verified.offers[0].availableBy,'2026-11-17');
 const missing=verifiedSourcing(report(),provider(result(),[]),now);assert.equal(missing.offers[0].availableBy,null);assert.equal(missing.offers[0].stock,'unknown');
 const generic=cleanSourcing({...report(),offers:[{...offer(),location:''}]});assert.equal(generic.offers[0].availableBy,null);
 assert.equal(offerTiming({...offer(),availableBy:null},report(),+now),'In stock · timing unverified');
 assert.equal(offerTiming({...offer(),availableBy:'2026-11-20'},report(),+now),'After your deadline');
 assert.equal(offerTiming(offer(),report(),+now+86400001),'Recheck availability');
});
test('shopping reports reject unsafe URLs and invalid dates, escape content, and preserve private history without secrets',()=>{
 for(const url of ['javascript:alert(1)','https://localhost/','https://127.0.0.1/','https://user:secret@example.com/'])assert.throws(()=>cleanSourcing({...report(),offers:[{...offer(),url}]}));
 assert.throws(()=>cleanSourcing({...report(),deadline:'2026-02-31'}));
 const html=sourcingHtml(report(),{review:true,now:+now});assert.match(html,/Display &lt;test&gt;/);assert.ok(!html.includes('<test>'));assert.match(html,/View at Retailer/);
 const chat=cleanChat([{role:'assistant',text:'Options',target:'grove-scd41',sourcing:report(),secret:'sk-private',proposal:{}}]);assert.equal(chat[0].target,'grove-scd41');assert.equal(chat[0].sourcing.offers[0].sku,'LCD-42');assert.equal(chat[0].secret,undefined);assert.equal(chat[0].proposal,undefined);assert.match(conversationText(chat[0]),/02134/);
 const large=cleanChat(Array.from({length:40},()=>({role:'assistant',text:'🧑'.repeat(2000),sourcing:report()})));assert.ok(new TextEncoder().encode(JSON.stringify(large)).length<=180000);assert.ok(large.length<40);
});
test('mocked assistant sourcing returns cards with no assembly mutation and removes unbacked ETAs',async()=>{
 const r=await runAdjustment(request(),'sk-test12345678901234567890',async()=>({ok:true,json:async()=>provider(result())}));
 assert.equal(r.status,200);assert.equal(r.body.proposal.sourcing.offers[0].stock,'in_stock');assert.deepEqual(r.body.proposal.changes,[]);assert.equal(r.body.proposal.enclosure,null);
 const missing=await runAdjustment(request(),'sk-test12345678901234567890',async()=>({ok:true,json:async()=>provider(result(),[])}));assert.equal(missing.body.proposal.sourcing.offers[0].stock,'unknown');
});
test('Find parts can return a sourcing-only shortlist without adding physical parts',async()=>{
 const p={projectName:'Nearby options',summary:'Compare these retailers.',enclosure:{width:120,height:50,depth:100},parts:[],connections:[],questions:[],sources:[],sourcing:report()};
 const r=await runResearch({...request(),mode:'parts'},'sk-test12345678901234567890',async()=>({ok:true,json:async()=>provider(p)}));
 assert.equal(r.status,200);assert.equal(r.body.proposal.parts.length,0);assert.equal(r.body.proposal.sourcing.offers[0].availableBy,'2026-11-17');
});
