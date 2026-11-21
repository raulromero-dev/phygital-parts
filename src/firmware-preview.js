import { partFor } from './engine.js';
import { escapeHtml as esc } from './product-data.js';
import { validateFirmwareBundle, validateFirmwareSession, MAX_FIRMWARE_BYTES } from './firmware-data.js';
import { downloadSimulation } from './firmware-download.js';
import './firmware-preview.css';

export function mountFirmwarePreview(app, container){
 const state=app.getState(),saved=state.firmware;
 const parts=state.instances.map(i=>partFor(state,i.id)).filter(p=>p.kind==='screen'||['expansion','crowpanel-advance-28'].includes(p.modelId||p.id)||/display|screen|oled/i.test(p.name+' '+p.interface));
 const preferred=parts.find(p=>p.id==='lcd-haldzemo-28'||p.modelId==='lcd-haldzemo-28');
 const selected=parts.find(p=>p.id===(saved?.partId||app.getSelected?.()))||preferred||parts.find(p=>p.kind==='screen')||parts[0];
 const dialog=document.createElement('section');dialog.className='firmware-dialog firmware-inline';dialog.setAttribute('aria-label','Firmware simulation');
 dialog.innerHTML=`<header class="firmware-header"><div><span class="firmware-kicker">Screen preview</span><h2>Simulation</h2></div><button type="button" class="icon-button" data-close aria-label="Close simulation">×</button></header><div class="firmware-body"><div class="firmware-stage"><div class="firmware-screen-wrap"><canvas class="firmware-canvas" width="240" height="320" tabindex="0" aria-label="Simulated display. Click to send touch input."></canvas><p class="firmware-empty">Preview your screen before flashing.</p></div><div class="firmware-transport"><button type="button" class="button" data-play disabled>Pause</button><button type="button" class="button" data-reset disabled>Reset</button><button type="button" class="button" data-snapshot disabled>Save image</button></div><span class="firmware-status" role="status">Choose a preview to begin.</span></div><aside class="firmware-controls"><label>Component<select data-part>${parts.map(p=>`<option value="${esc(p.id)}" ${p.id===selected?.id?'selected':''}>${esc(p.short||p.name)}</option>`).join('')}</select></label><label>Firmware<select data-profile><option value="">Choose a preview…</option><option value="phygital-tft">Phygital · 2.8″ screen</option>${saved?.profile==='imported'?`<option value="imported">${esc(saved.bundle.name)}</option>`:''}</select></label><label data-scene-label hidden>Test scene<select data-scene></select></label><details class="firmware-test-inputs"><summary>Test inputs</summary><div data-inputs class="firmware-inputs"></div></details><p class="firmware-hint">Tap to interact. Simulated sensor data.</p><button type="button" class="button" data-save disabled>Save preview to project</button><button type="button" class="button primary" data-package disabled>Download files</button><p class="firmware-source" data-source></p><details class="firmware-help"><summary>Use your own firmware</summary><div class="firmware-actions"><button type="button" class="button" data-import>Import preview</button><input data-file type="file" accept=".json,application/json" hidden><button type="button" class="text-button" data-export disabled>Preview only · JSON</button></div><p>Compile your screen-drawing code with a framebuffer adapter, then import its .json preview bundle. The same workflow works with other boards and display sizes.</p><a href="https://github.com/raulromero-dev/phygital-studio/blob/main/docs/FIRMWARE_PREVIEWS.md" target="_blank" rel="noopener noreferrer">Adapter guide ↗</a><p>This runs the screen renderer, not the full MCU, radio or electrical circuit. Source code and device flashing stay in your firmware repository.</p></details><p class="firmware-error" role="alert" hidden></p></aside></div>`;
 container.replaceChildren(dialog);
 const $=s=>dialog.querySelector(s),canvas=$('canvas'),context=canvas.getContext('2d');
 let worker=null,bundle=null,imported=saved?.bundle||null,sequence=0,loading=0,closed=false,playing=true,timer=null,pending=new Map(),lastFrame=null,fetchController,downloading=false,overrides=new Map();
 const download=(data,name,type)=>{const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 function stop(){worker?.terminate();worker=null;clearInterval(timer);timer=null;for(const {timeout,reject}of pending.values()){clearTimeout(timeout);reject?.(Error('The preview changed before the download finished.'));}pending.clear();}
 function fail(message){stop();$('.firmware-error').hidden=false;$('.firmware-error').textContent=message;$('.firmware-status').textContent='Preview stopped';for(const s of ['[data-play]','[data-reset]','[data-save]','[data-snapshot]','[data-export]','[data-package]'])$(s).disabled=true;}
 function send(type,values={},callbacks={}){if(!worker){callbacks.reject?.(Error('Preview is not ready.'));return;}const id=++sequence;const timeout=setTimeout(()=>fail('The preview stopped responding. Choose a preview again to restart.'),type==='init'?10000:3000);pending.set(id,{timeout,...callbacks});worker.postMessage({id,type,...values});}
 function draw(frame){lastFrame=frame;for(const current of frame.inputs||[]){const input=$('[data-input="'+current.id+'"]'),info=bundle.inputs.find(i=>i.id===current.id);if(input&&info&&document.activeElement!==input){input.value=current.value;input.nextElementSibling.textContent=current.value+(info.unit?' '+info.unit:'');}}canvas.width=frame.width;canvas.height=frame.height;canvas.style.aspectRatio=frame.width+'/'+frame.height;context.putImageData(new ImageData(frame.rgba,frame.width,frame.height),0,0);$('.firmware-empty').hidden=true;canvas.hidden=false;$('.firmware-status').textContent=`${frame.width} × ${frame.height} · ${playing?'Running':'Paused'} · RGB565`;for(const s of ['[data-play]','[data-reset]','[data-save]','[data-snapshot]'])$(s).disabled=false;for(const s of ['[data-export]','[data-package]'])$(s).disabled=downloading;}
 async function load(value,settings){
  const epoch=++loading;stop();fetchController?.abort();fetchController=new AbortController();$('.firmware-error').hidden=true;bundle=null;lastFrame=null;overrides.clear();canvas.hidden=true;$('.firmware-empty').hidden=false;$('.firmware-empty').textContent=value?'Loading compiled renderer…':'Preview your screen before flashing.';$('.firmware-status').textContent=value?'Loading preview…':'Choose a preview to begin.';
  for(const s of ['[data-play]','[data-reset]','[data-save]','[data-snapshot]','[data-export]','[data-package]'])$(s).disabled=true;
  $('[data-inputs]').innerHTML='';$('[data-scene-label]').hidden=true;$('[data-source]').innerHTML='';if(!value)return;
  try{
   let data=imported;
   if(value==='phygital-tft'){const response=await fetch('/firmware/phygital-tft.json',{signal:fetchController.signal});if(!response.ok)throw Error('The compiled preview could not load. Try again.');data=await response.json();}
   if(closed||epoch!==loading)return;bundle=validateFirmwareBundle(data);
   const session=validateFirmwareSession(settings??bundle.session??{scene:0,paused:false,inputs:[]},bundle);overrides=new Map(session.inputs.map(i=>[i.id,i.value]));
   $('[data-scene]').innerHTML=bundle.scenes.map((name,i)=>`<option value="${i}">${esc(name)}</option>`).join('');$('[data-scene-label]').hidden=false;$('[data-scene]').value=session.scene;
   $('[data-inputs]').innerHTML=bundle.inputs.map(i=>`<label>${esc(i.name)}<span><input type="range" data-input="${i.id}" min="${i.min}" max="${i.max}" step="${i.step}" value="${overrides.get(i.id)??i.value}"><output>${overrides.get(i.id)??i.value}${esc(i.unit?' '+i.unit:'')}</output></span></label>`).join('');
   $('[data-source]').innerHTML=`${bundle.sourceUrl?`<a href="${esc(bundle.sourceUrl)}" target="_blank" rel="noopener noreferrer">Firmware source ↗</a>`:''}${bundle.revision?`<span>Revision ${esc(bundle.revision.slice(0,12))}</span>`:''}`;
   $('[data-inputs]').querySelectorAll('input').forEach(input=>input.oninput=()=>{const info=bundle.inputs.find(i=>i.id===+input.dataset.input);input.nextElementSibling.textContent=input.value+(info.unit?' '+info.unit:'');overrides.set(info.id,+input.value);send('input',{input:info.id,value:+input.value});});
   worker=new Worker(new URL('./firmware-worker.js',import.meta.url),{type:'module'});
   worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;clearTimeout(request.timeout);pending.delete(data.id);if(data.type==='error'){request.reject?.(Error(data.error));fail(data.error);}else{draw(data);request.resolve?.(data);}};
   worker.onerror=()=>fail('The renderer could not run. Check the preview bundle or try another browser.');
   playing=!session.paused;$('[data-play]').textContent=playing?'Pause':'Play';send('init',{bundle,session});
   timer=setInterval(()=>{if(playing&&!document.hidden&&!pending.size)send('step',{ms:100});},100);
  }catch(error){if(closed||epoch!==loading||error.name==='AbortError')return;fail(error.message);}
 }
 $('[data-part]').onchange=()=>app.select?.($('[data-part]').value);
 $('[data-profile]').onchange=()=>load($('[data-profile]').value);
 $('[data-scene]').onchange=()=>{overrides.clear();send('scene',{index:+$('[data-scene]').value});$('[data-inputs]').querySelectorAll('output').forEach(o=>o.textContent='Adjust to override');};
 $('[data-play]').onclick=()=>{playing=!playing;$('[data-play]').textContent=playing?'Pause':'Play';if(lastFrame)draw(lastFrame);};
 $('[data-reset]').onclick=()=>{overrides.clear();send('scene',{index:+$('[data-scene]').value});};
 canvas.onpointerdown=event=>{const box=canvas.getBoundingClientRect();send('tap',{x:(event.clientX-box.left)*canvas.width/box.width,y:(event.clientY-box.top)*canvas.height/box.height});};
 canvas.onkeydown=event=>{if(['ArrowRight','ArrowLeft'].includes(event.key)&&bundle){event.preventDefault();const select=$('[data-scene]');select.value=(+select.value+(event.key==='ArrowRight'?1:bundle.scenes.length-1))%bundle.scenes.length;select.onchange();}};
 $('[data-snapshot]').onclick=()=>canvas.toBlob(blob=>{if(blob)download(blob,'screen-preview.png','image/png');});
 function session(paused=!playing){
  const values=new Map(overrides);
  for(const input of lastFrame?.inputs||[]){const spec=bundle.inputs.find(i=>i.id===input.id);if(spec&&input.value>=spec.min&&input.value<=spec.max)values.set(input.id,input.value);}
  return validateFirmwareSession({scene:+$('[data-scene]').value,paused,inputs:[...values].map(([id,value])=>({id,value}))},bundle);
 }
 function binding(settings){return {partId:$('[data-part]').value,profile:$('[data-profile]').value,...($('[data-profile]').value==='imported'?{bundle}:{}),session:settings};}
 async function exportFiles(packageFiles){
  if(!bundle||!worker||downloading)return;
  const epoch=loading,wasPlaying=playing;downloading=true;playing=false;
  for(const s of ['[data-export]','[data-package]'])$(s).disabled=true;
  $('[data-package]').textContent=packageFiles?'Preparing…':'Download files';
  try{
   await new Promise((resolve,reject)=>send('frame',{}, {resolve,reject}));
   if(closed||epoch!==loading)return;
   const settings=session(!wasPlaying),preview=validateFirmwareBundle({...bundle,session:settings});
   if(!packageFiles){download(JSON.stringify(preview,null,2),'firmware-preview.json','application/json');return;}
   const currentBinding=binding(settings),project=structuredClone(app.getState());
   const frame=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not capture the display.')),'image/png'));
   let source=null;
   if(currentBinding.profile==='phygital-tft'||preview.sourceUrl==='https://github.com/raulromero-dev/phygital'){
    const response=await fetch('/firmware/phygital-tft-source.json',{signal:fetchController.signal});
    if(!response.ok)throw Error('Renderer source could not download. Try again, or use Preview only · JSON.');
    try{source=await response.json();}catch(error){if(error.name==='AbortError')throw error;throw Error('Renderer source could not download. Try again, or use Preview only · JSON.');}
   }
   if(closed||epoch!==loading)return;
   const zip=downloadSimulation({bundle:preview,state:project,binding:currentBinding,source,frame:new Uint8Array(await frame.arrayBuffer())});
   download(zip,'phygital-simulation.zip','application/zip');app.toast('Simulation files downloaded.');
  }catch(error){if(!closed&&epoch===loading&&error.name!=='AbortError')app.toast(error.message||'Download failed. Try again.');}
  finally{downloading=false;if(!closed){if(epoch===loading)playing=wasPlaying;$('[data-package]').textContent='Download files';if(lastFrame&&worker)draw(lastFrame);}}
 }
 $('[data-export]').onclick=()=>exportFiles(false);
 $('[data-package]').onclick=()=>exportFiles(true);
 $('[data-import]').onclick=()=>{if(app.ensureEditable())$('[data-file]').click();};
 $('[data-file]').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>MAX_FIRMWARE_BYTES*1.4+30000)throw Error('Choose a preview bundle under 850 KB.');const data=validateFirmwareBundle(JSON.parse(await file.text()));if(closed)return;imported=data;let option=$('[data-profile] option[value="imported"]');if(!option){option=document.createElement('option');option.value='imported';$('[data-profile]').append(option);}option.textContent=data.name;$('[data-profile]').value='imported';await load('imported',data.session);}catch(error){fail(error.message);}finally{event.target.value='';}};
 $('[data-save]').onclick=async()=>{if(!bundle||!$('[data-part]').value)return;const epoch=loading;try{await new Promise((resolve,reject)=>send('frame',{}, {resolve,reject}));if(closed||epoch!==loading)return;app.save(binding(session()));app.toast('Preview saved to this project.');}catch(error){if(!closed&&epoch===loading)app.toast(error.message);}};
 const selection=event=>{if([...$('[data-part]').options].some(o=>o.value===event.detail.id))$('[data-part]').value=event.detail.id;};
 const close=()=>{if(closed)return;closed=true;++loading;fetchController?.abort();stop();document.removeEventListener('phygital:project',close);document.removeEventListener('phygital:selection',selection);dialog.remove();};
 $('[data-close]').onclick=()=>app.close();document.addEventListener('phygital:project',close);document.addEventListener('phygital:selection',selection);
 if(selected)app.select?.(selected.id);
 $('[data-profile]').value=saved?.profile||(preferred?'phygital-tft':'');load($('[data-profile]').value,saved?.session);
 return {destroy:close,getContext:()=>bundle?{partId:$('[data-part]').value,name:bundle.name,profile:$('[data-profile]').value,sourceUrl:bundle.sourceUrl,revision:bundle.revision,width:bundle.width,height:bundle.height,scene:bundle.scenes[+$('[data-scene]').value],inputs:lastFrame?.inputs||[],status:worker?(playing?'running':'paused'):'stopped',scope:'Screen renderer only; synthetic sensor data. Not hardware validation.'}:null};
}
