import test from 'node:test';
import assert from 'node:assert/strict';
import {validateChatImages,MAX_IMAGE_BYTES} from '../src/chat-images.js';
import {cleanChat} from '../src/chat-data.js';
import {prepareAdjustment,runAdjustment} from '../server/adjust.mjs';
import {defaultState} from '../src/catalog.js';
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG4sAAAAASUVORK5CYII=';
const body=()=>({prompt:'Map these visible connectors',context:{parts:defaultState().instances},images:[photo]});
test('photos reach Responses as image inputs, with current part context and bounded previous photos',()=>{
 const request=prepareAdjustment({...body(),selectedPartId:'thermal',history:[{role:'user',text:'Earlier connector',images:[photo]}]});
 const content=request.input[0].content;
 assert.equal(content.filter(c=>c.type==='input_image').length,2);
 assert(content.filter(c=>c.type==='input_image').every(c=>c.image_url===photo&&c.detail==='high'));
 assert.match(content[0].text,/thermal/);assert(!content[0].text.includes('base64'));
 assert.equal(request.store,false);
});
test('chat image validation rejects remote URLs, SVG, forged MIME, excess counts and oversized files',()=>{
 assert.deepEqual(validateChatImages([photo]),[photo]);
 for(const value of [['https://example.com/photo.jpg'],['data:image/svg+xml;base64,PHN2Zz4='],['data:image/png;base64,aGVsbG8='],Array(5).fill(photo),['data:image/jpeg;base64,'+Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(MAX_IMAGE_BYTES)]).toString('base64')],{}])assert.throws(()=>validateChatImages(value));
 assert.throws(()=>prepareAdjustment({...body(),history:[{role:'user',text:'earlier',images:Array(4).fill(photo)}]}),/four photos/);
});
test('photos are excluded from persistent history, copies and account saves; count remains',()=>{
 const chat=cleanChat([{role:'user',text:'Look here',images:[photo],key:'secret'},{role:'assistant',text:'Visible socket.'}]);
 assert.equal(chat[0].imageCount,1);assert(!JSON.stringify(chat).includes('base64'));assert(!JSON.stringify(chat).includes('secret'));
 assert.deepEqual(cleanChat(chat),chat);
});
test('mocked multimodal adjustment produces the same reviewed actions and rejects invalid photos before billing',async()=>{
 let called=0;
 const mock=async(_url,options)=>{called++;const request=JSON.parse(options.body);assert.equal(request.input[0].content.at(-1).type,'input_image');return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({message:'Review this position.',changes:[{partId:'thermal',position:[20,30,20],rotation:null,dimensions:null,note:null}],enclosure:null})}]}]})};};
 const result=await runAdjustment(body(),'sk-'+'x'.repeat(24),mock);assert.equal(result.status,200);assert.equal(result.body.proposal.changes[0].partId,'thermal');
 const invalid=await runAdjustment({...body(),images:['bad']},'sk-'+'x'.repeat(24),mock);assert.equal(invalid.status,400);assert.equal(called,1);
});
