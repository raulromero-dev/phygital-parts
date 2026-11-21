import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateFirmwareBundle,validateFirmwareSession,firmwareBytes} from '../src/firmware-data.js';
import {createFirmwareRuntime} from '../src/firmware-runtime.js';
import {downloadSimulation,simulationFiles} from '../src/firmware-download.js';
import {storedZip} from '../src/download-zip.js';
import {defaultState} from '../src/catalog.js';
import {validateState} from '../src/engine.js';
import {addLayouts,switchLayout} from '../src/layouts.js';
const root=new URL('../',import.meta.url);
const bundle=JSON.parse(fs.readFileSync(new URL('public/firmware/phygital-tft.json',root)));
const session={scene:4,paused:true,inputs:[{id:0,value:-70},{id:1,value:1},{id:2,value:0},{id:3,value:1}]};
const binding={partId:'expansion',profile:'phygital-tft',session};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

test('saved settings replay into a fresh real renderer with identical scene pixels and readback',async()=>{
 const original=await createFirmwareRuntime(bundle);original.scene(session.scene);
 for(const {id,value}of session.inputs)original.input(id,value);
 const portable=validateFirmwareBundle(JSON.parse(JSON.stringify({...bundle,session})));
 const fresh=await createFirmwareRuntime(portable),frame=fresh.restore(portable.session);
 assert.equal(digest(frame.rgba),digest(original.frame().rgba));
 assert.deepEqual(frame.inputs,session.inputs);
 assert.equal(portable.session.paused,true);
});

test('exports capture current settings without changing source project and retain independent layout settings',()=>{
 const state=defaultState();state.firmware={...binding,session:{scene:0,paused:false,inputs:[]}};
 const alternative=structuredClone(state);alternative.firmware.session.scene=2;
 const layouts=addLayouts(state,[{name:'Alternative',document:alternative}]),before=structuredClone(layouts);
 Object.assign(layouts,{apiKey:'private-test-key',chat:[{text:'private-chat'}],images:['private-photo']});
 const files=new Map(simulationFiles({state:layouts,binding,bundle}));
 const project=validateState(JSON.parse(files.get('project.json')));
 assert.deepEqual(project.firmware.session,session);
 assert.equal(project.layouts.variants.length,2);
 assert.equal(switchLayout(project,project.layouts.variants[1].id).firmware.session.scene,2);
 assert.deepEqual(layouts.firmware,before.firmware);
 for(const secret of ['private-test-key','private-chat','private-photo'])assert(!files.get('project.json').includes(secret));
 assert.deepEqual(JSON.parse(files.get('preview.json')).session,session);
 assert.deepEqual(files.get('renderer.wasm'),firmwareBytes(bundle.wasm));
});

test('invalid settings reject before running; settings strip unexpected fields',()=>{
 const cases=[{...session,scene:32},{...session,scene:-1},{...session,paused:'yes'},
  {...session,inputs:[{id:0,value:-999}]},{...session,inputs:[{id:9,value:1}]},
  {...session,inputs:[{id:0,value:-50},{id:0,value:-40}]},{...session,inputs:[{id:0,value:NaN}]}];
 for(const bad of cases)assert.throws(()=>validateFirmwareBundle({...bundle,session:bad}));
 assert.deepEqual(validateFirmwareSession({...session,secret:'do not keep'},bundle),session);
});

test('download archive opens with Python zipfile, passes CRC checks and preserves source, binary and Unicode paths',async()=>{
 execFileSync(process.execPath,[new URL('scripts/package-firmware-source.mjs',root).pathname]);
 const source=JSON.parse(fs.readFileSync(new URL('public/firmware/phygital-tft-source.json',root)));
 assert.equal(source.sha256,digest(firmwareBytes(bundle.wasm)));
 for(const file of source.files){assert.equal(digest(file.text),file.sha256);assert.equal(file.text,fs.readFileSync(new URL(file.path,root),'utf8'));}
 const zip=downloadSimulation({bundle,binding,state:defaultState(),source,frame:Uint8Array.from([137,80,78,71])});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'phygital-export-'));
 try{
  const file=path.join(dir,'simulation.zip');fs.writeFileSync(file,new Uint8Array(await zip.arrayBuffer()));
  const result=JSON.parse(execFileSync('python3',['-c',`import zipfile,json,hashlib,sys
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 print(json.dumps({'files':z.namelist(),'preview':json.loads(z.read('preview.json'))['session'],'sha256':hashlib.sha256(z.read('renderer.wasm')).hexdigest(),'build':z.read('source/scripts/build-firmware-preview.py').decode()}))`,file],{encoding:'utf8'}));
  assert.deepEqual(result.preview,session);assert.equal(result.sha256,bundle.sha256);
  for(const name of ['project.json','connections.csv','screen.png','README.md','source/firmware-preview/vendor/phygital/tft_ui.h','source/firmware-preview/vendor/phygital/tools/tft_sim/scenes.txt','source/firmware-preview/vendor/adafruit-gfx/license.txt'])assert(result.files.includes(name),name);
  assert(result.build.includes('parents=True'));
  fs.writeFileSync(file,new Uint8Array(await storedZip([['écran/你好.txt','240 × 320']]).arrayBuffer()));
  assert.equal(execFileSync('python3',['-c',"import zipfile,sys; print(zipfile.ZipFile(sys.argv[1]).read('écran/你好.txt').decode())",file],{encoding:'utf8'}).trim(),'240 × 320');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('generic imported renderer retains compiled code without attaching another firmware source',()=>{
 const example=JSON.parse(fs.readFileSync(new URL('tests/fixtures/screen-example.json',root)));
 const settings={scene:1,paused:false,inputs:[{id:0,value:73}]};
 const imported={partId:'expansion',profile:'imported',bundle:example,session:settings};
 const files=new Map(simulationFiles({bundle:example,binding:imported,state:defaultState(),source:{format:'phygital-renderer-source',sha256:bundle.sha256,revision:bundle.revision,files:[{path:'wrong.cpp',text:'wrong'}]}}));
 assert(![...files.keys()].some(p=>p.startsWith('source/')));
 assert.match(files.get('README.md'),/Original C\/C\+\+ source was not supplied/);
 assert.deepEqual(firmwareBytes(JSON.parse(files.get('preview.json')).wasm),files.get('renderer.wasm'));
 assert.deepEqual(JSON.parse(files.get('project.json')).firmware.session,settings);
});

test('archive refuses traversal, absolute paths, duplicates and oversized content',()=>{
 for(const name of ['../file','source/../../file','/file','source\\file','a//b'])assert.throws(()=>storedZip([[name,'x']]));
 assert.throws(()=>storedZip([['file','x'],['file','y']]));
 assert.throws(()=>storedZip([['file',new Uint8Array(32_000_001)]]));
 assert.throws(()=>downloadSimulation({bundle,binding,state:defaultState(),source:{format:'phygital-renderer-source',sha256:bundle.sha256,revision:bundle.revision,files:[{path:'../../escape',text:'x'}]}}));
});
