import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateFirmwareBundle,validateFirmwareState,checkWasmLimits,firmwareBytes} from '../src/firmware-data.js';
import {createFirmwareRuntime} from '../src/firmware-runtime.js';
import {validateState} from '../src/engine.js';
import {defaultState} from '../src/catalog.js';
import {addLayouts,switchLayout} from '../src/layouts.js';
import {rewireHaldzemo} from '../src/haldzemo-rewire.js';
import {appendHaldzemoComparison} from '../src/haldzemo-assembly.js';
const bundle=JSON.parse(fs.readFileSync(new URL('../public/firmware/phygital-tft.json',import.meta.url)));
const hash=frame=>crypto.createHash('sha256').update(frame.rgba).digest('hex');
test('real firmware scenes render distinct frames; actual tab taps and sensor values change pixels',async()=>{
 const runtime=await createFirmwareRuntime(bundle);
 const hashes=new Set(bundle.scenes.map((_,i)=>hash(runtime.scene(i))));assert.equal(hashes.size,8);
 runtime.scene(2);const sweep=hash(runtime.frame());const heat=hash(runtime.tap(25,300));assert.notEqual(heat,sweep);assert.equal(hash(runtime.tap(85,300)),sweep);
 runtime.scene(4);const near=hash(runtime.input(0,-30));const far=hash(runtime.input(0,-90));assert.notEqual(near,far);
 assert.equal(runtime.frame().width,240);assert.equal(runtime.frame().rgba.length,240*320*4);
 assert.throws(()=>runtime.input(0,900));assert.throws(()=>runtime.scene(99));
});
test('all eight WASM frames match the original native simulator pixel for pixel',async()=>{
 const expected=JSON.parse(fs.readFileSync(new URL('./fixtures/firmware-native-hashes.json',import.meta.url)));
 const runtime=await createFirmwareRuntime(bundle);
 for(const [index,[name,digest]]of Object.entries(expected).entries()){
  const {rgba}=runtime.scene(index),rgb=new Uint8Array(240*320*3);
  for(let i=0;i<240*320;i++){rgb[i*3]=rgba[i*4]&248;rgb[i*3+1]=rgba[i*4+1]&252;rgb[i*3+2]=rgba[i*4+2]&248;}
  assert.equal(crypto.createHash('sha256').update(rgb).digest('hex'),digest,name);
 }
});
test('an independently compiled renderer imports with its own size, scenes and input controls',async()=>{
 const example=JSON.parse(fs.readFileSync(new URL('./fixtures/screen-example.json',import.meta.url)));
 const runtime=await createFirmwareRuntime(example);assert.equal(runtime.frame().width,128);assert.equal(runtime.frame().height,64);
 const first=hash(runtime.scene(0));assert.notEqual(first,hash(runtime.scene(1)));assert.notEqual(hash(runtime.input(0,10)),hash(runtime.input(0,90)));
 const before=hash(runtime.frame());assert.notEqual(before,hash(runtime.tap(20,20)));
});
test('firmware identity and real source files are pinned and reproducible',()=>{
 assert.equal(crypto.createHash('sha256').update(firmwareBytes(bundle.wasm)).digest('hex'),bundle.sha256);
 const sources=JSON.parse(fs.readFileSync(new URL('../firmware-preview/sources.json',import.meta.url)));
 assert.equal(bundle.revision,sources.revision);
 for(const [path,expected]of Object.entries(sources.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../firmware-preview/vendor/phygital/'+path,import.meta.url))).digest('hex'),expected);
});
test('compiled previews persist through validation, JSON export and independent layouts',()=>{
 const state=defaultState();state.firmware={partId:'expansion',profile:'imported',bundle};
 const round=validateState(JSON.parse(JSON.stringify(state)));assert.deepEqual(round.firmware,state.firmware);
 const branch=structuredClone(round);branch.firmware={partId:'expansion',profile:'phygital-tft'};
 const layouts=addLayouts(round,[{name:'Different renderer',description:'Own profile',document:branch}]);
 assert.equal(layouts.firmware.profile,'imported');assert.equal(switchLayout(layouts,layouts.layouts.variants.at(-1).id).firmware.profile,'phygital-tft');
 const other=defaultState();assert.equal(other.firmware,undefined);
 assert.throws(()=>validateFirmwareState({partId:'missing',profile:'phygital-tft'},['expansion']));
});
test('preview imports reject malformed modules, unbounded allocations, unsafe links and mismatched pixels',async()=>{
 for(const value of [{...bundle,width:2000},{...bundle,sourceUrl:'javascript:alert(1)'},{...bundle,scenes:[]},{...bundle,wasm:'aGVsbG8='}])assert.throws(()=>validateFirmwareBundle(value));
 assert.throws(()=>checkWasmLimits(Uint8Array.from([0,97,115,109,1,0,0,0,5,3,1,0,1])),/bounded/);
 await assert.rejects(()=>createFirmwareRuntime({...bundle,sha256:'0'.repeat(64)}),/checksum/);
 await assert.rejects(()=>createFirmwareRuntime({...bundle,width:320}),/resolution/);
});
test('explicit physical rewiring preserves every placement and unrelated cable across all layouts',()=>{
 const original=appendHaldzemoComparison(defaultState()),screen='lcd-haldzemo-28',carrier='custom-haldzemo-carrier';
 // A legacy saved harness, including a reversed DC conductor and custom cable length.
 original.connections.find(c=>c.from===screen+':vcc').to=carrier+':h-3v3';
 const dc=original.connections.find(c=>c.from===screen+':dc');dc.to=screen+':dc';dc.from=carrier+':h-d2';dc.length=77;
 original.connections.push({...dc,id:'old-int',from:screen+':tp-int',to:carrier+':h-d9'});
 const input=addLayouts(original,[{name:'Directional',description:'Keep this arrangement',document:original}]),before=structuredClone(input);
 const result=validateState(rewireHaldzemo(input));assert.deepEqual(input,before);
 for(const doc of [result,...result.layouts.variants.map(v=>v.document)]){
  assert.deepEqual(doc.instances,original.instances);
  const wires=doc.connections.filter(c=>[c.from,c.to].some(x=>x.startsWith(screen+':')));assert.equal(wires.length,10);
  assert(wires.some(c=>c.from===screen+':vcc'&&c.to===carrier+':h-5v'));
  assert(wires.some(c=>c.to===screen+':dc'&&c.from===carrier+':h-d9'&&c.length===77));
  assert(!wires.some(c=>[c.from,c.to].includes(screen+':tp-int')));
  assert.deepEqual(doc.connections.filter(c=>![c.from,c.to].some(x=>x.startsWith(screen+':'))),original.connections.filter(c=>![c.from,c.to].some(x=>x.startsWith(screen+':'))));
 }
});
