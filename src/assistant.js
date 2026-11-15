import { codexMark } from './brand.js';
import { loadingIndicator } from './loading.js';
import { escapeHtml as esc } from './product-data.js';
import { partFor, checks } from './engine.js';
import { portsFor } from './connections.js';
import { applyAdjustments } from './adjustments.js';

export function mountAssistant(app){
 const $=s=>document.querySelector(s);
 let selected=null,pending=false,abort=null,messages=[],sequence=0,build=null,buildTimer;
 let historyKey=app.getStorageKey()+'.chat';
 try{const saved=JSON.parse(localStorage.getItem(historyKey)||'[]');if(Array.isArray(saved))messages=saved.slice(-40).filter(m=>['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=4000).map(m=>({id:++sequence,role:m.role,text:m.text,partName:typeof m.partName==='string'?m.partName.slice(0,100):null,applied:!!m.applied}));}catch{}
 const root=document.createElement('aside');root.className='codex-chat';root.id='codex-chat';root.hidden=true;root.setAttribute('aria-label','Codex assistant');
 root.innerHTML=`<header class="chat-header"><strong>${codexMark}<span>codex</span></strong><div><button id="chat-expand" aria-label="Expand chat" title="Expand chat">⤢</button><button id="chat-minimize" aria-label="Minimize chat" title="Minimize chat">−</button></div></header><div id="chat-messages" class="chat-messages" role="log" aria-label="Chat history" aria-live="polite"></div><div class="chat-compose"><div id="chat-context" class="chat-context"></div><form id="chat-form"><label class="sr-only" for="chat-prompt">Message codex</label><textarea id="chat-prompt" required maxlength="4000" rows="2" placeholder="Adjust this build…"></textarea><div class="chat-send-row"><span id="chat-status">Tap a part to attach it.</span><button type="button" id="chat-stop" hidden>Stop</button><button type="submit" id="chat-send" aria-label="Send message">↑</button></div></form></div>`;
 const launcher=document.createElement('button');launcher.id='ask-codex';launcher.className='codex-launcher';launcher.innerHTML=codexMark+'<span>codex</span>';launcher.setAttribute('aria-controls','codex-chat');launcher.setAttribute('aria-expanded','false');
 document.body.append(root,launcher);
 function open(){root.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');selected=app.getSelected();renderContext();renderMessages();$('#chat-prompt').focus();}
 function minimize(){root.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');}
 launcher.onclick=open;$('#chat-minimize').onclick=minimize;
 $('#chat-expand').onclick=()=>{const full=root.classList.toggle('expanded');$('#chat-expand').setAttribute('aria-label',full?'Collapse chat':'Expand chat');$('#chat-expand').title=full?'Collapse chat':'Expand chat';};
 root.addEventListener('keydown',event=>{if(event.key==='Escape')minimize();});
 function renderContext(){
  const state=app.getState(),part=selected&&state.instances.some(p=>p.id===selected)?partFor(state,selected):null;
  if(!part)selected=null;
  $('#chat-context').innerHTML=part?`<span>↳ ${esc(part.short)}</span><button id="chat-clear-part" aria-label="Remove part context">×</button>`:'';
  $('#chat-clear-part')?.addEventListener('click',()=>{selected=null;renderContext();});
 }
 function describe(proposal,state){
  const lines=[];
  for(const change of proposal.changes){const part=partFor(state,change.partId)?.short||change.partId;
   for(const [key,label,unit]of [['position','Move','mm'],['rotation','Rotate','°'],['dimensions','Resize','mm']])if(change[key])lines.push(`${label} ${part}: ${change[key].join(' / ')} ${unit}`);
   if(change.note)lines.push(`Add a note to ${part}`);
  }
  if(proposal.enclosure)lines.push(`Interior: ${proposal.enclosure.join(' × ')} mm`);
  return lines;
 }
 function renderMessages(){
  const log=$('#chat-messages');
  log.innerHTML=messages.length?messages.map(message=>`<article class="chat-message ${message.role}">${message.partName?`<small>↳ ${esc(message.partName)}</small>`:''}<p>${esc(message.text)}</p>${message.proposal?`<div class="chat-proposal"><ul>${describe(message.proposal,message.state).map(line=>`<li>${esc(line)}</li>`).join('')}</ul>${message.checks?`<small>${esc(message.checks)}</small>`:''}<button class="button" data-chat-apply="${message.id}" ${message.applied?'disabled':''}>${message.applied?'Applied':'Apply changes'}</button></div>`:''}</article>`).join(''):'<p class="chat-empty">Move a part, adjust the fit, or ask about this assembly.</p>';
  if(build)log.insertAdjacentHTML('beforeend',`<section class="chat-build">${build.active?loadingIndicator(build.label,true):`<p>${esc(build.label)}</p>`}<ul>${[...build.items.values()].map(item=>`<li><span>${esc(item.name)}</span><small>${esc(item.status)}</small></li>`).join('')}</ul><small class="build-elapsed">${Math.floor((Date.now()-build.started)/1000)}s</small>${!build.active&&build.retry?'<button class="text-button" id="retry-build">Retry build</button>':''}</section>`);
  $('#retry-build')?.addEventListener('click',()=>build.retry());
  if(pending)log.insertAdjacentHTML('beforeend',`<div class="chat-thinking">${loadingIndicator('Thinking…',true)}</div>`);
  root.querySelectorAll('[data-chat-apply]').forEach(button=>button.onclick=()=>{
   const message=messages.find(m=>m.id===+button.dataset.chatApply);
   try{app.applyAdjustment(message.proposal,message.base);message.applied=true;renderMessages();app.toast('Changes applied. Undo is available.');}catch(error){app.toast(error.message);}
  });
  log.scrollTop=log.scrollHeight;
  try{localStorage.setItem(historyKey,JSON.stringify(messages.slice(-40).map(({role,text,partName,applied})=>({role,text,partName,applied}))));}catch{}
 }
 async function send(prompt,target){
  if(pending||build?.active)return;
  const state=structuredClone(app.getState());if(!state.instances.length){app.toast('Add a part before asking for adjustments.');return;}
  if(target&&!state.instances.some(p=>p.id===target))target=null;
  const previous=messages.map(m=>({role:m.role,text:m.text})).slice(-8);
  messages.push({id:++sequence,role:'user',text:prompt,partName:target?partFor(state,target)?.short:null});$('#chat-prompt').value='';pending=true;abort=new AbortController();$('#chat-send').disabled=true;$('#chat-stop').hidden=false;$('#chat-status').textContent='Working on your request';renderMessages();
  try{
   const context={name:state.name,enclosure:state.enclosure,lockCore:state.lockCore,parts:state.instances.map(instance=>{const part=partFor(state,instance.id);return {...instance,name:part.name,interface:part.interface,electrical:part.electrical,placement:part.placement,ports:portsFor(state,instance.id)};}),connections:state.connections};
   const response=await fetch('/api/adjust',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+app.getKey()},body:JSON.stringify({prompt,selectedPartId:target,context,history:previous}),signal:abort.signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'The assistant could not finish.');
   const proposal=result.proposal,hasChanges=proposal.enclosure||proposal.changes.some(c=>c.position||c.rotation||c.dimensions||c.note);
   const message={id:++sequence,role:'assistant',text:proposal.message};
   if(hasChanges){const preview=applyAdjustments(state,proposal);const warnings=checks(preview).filter(c=>c.level==='warn');Object.assign(message,{proposal,state,base:JSON.stringify(state),checks:warnings.length?`${warnings.length} assembly checks need review after this change.`:'Review the proposed changes before applying.'});}
   messages.push(message);
  }catch(error){messages.push({id:++sequence,role:'assistant',text:error.name==='AbortError'?'Stopped. Your assembly is unchanged.':error.message});}
  finally{pending=false;abort=null;$('#chat-send').disabled=false;$('#chat-stop').hidden=true;$('#chat-status').textContent='Tap a part to attach it.';renderMessages();}
 }
 $('#chat-form').onsubmit=event=>{event.preventDefault();const prompt=$('#chat-prompt').value.trim(),target=selected;if(!prompt||pending||build?.active)return;app.ensureKey(()=>send(prompt,target));};
 $('#chat-prompt').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#chat-form').requestSubmit();}});
 $('#chat-stop').onclick=()=>build?.active?build.cancel():abort?.abort();
 document.addEventListener('phygital:selection',event=>{selected=event.detail.id;renderContext();});
 document.addEventListener('phygital:state',()=>renderContext());
 document.addEventListener('phygital:project',()=>{abort?.abort();clearInterval(buildTimer);build=null;messages=[];selected=null;historyKey=app.getStorageKey()+'.chat';renderMessages();renderContext();});
 function buildControls(active){$('#chat-send').disabled=active;$('#chat-prompt').disabled=active;$('#chat-stop').hidden=!active;$('#chat-status').textContent=active?'Building your project':'Tap a part to attach it.';}
 return {open,minimize,
  beginBuild:(prompt,cancel)=>{messages.push({id:++sequence,role:'user',text:prompt.slice(0,4000)});build={active:true,label:'Finding your parts…',started:Date.now(),items:new Map(),cancel};buildControls(true);open();clearInterval(buildTimer);buildTimer=setInterval(()=>{const elapsed=root.querySelector('.build-elapsed');if(elapsed&&build)elapsed.textContent=Math.floor((Date.now()-build.started)/1000)+'s';},1000);},
  updateBuild:label=>{if(build){build.label=label;renderMessages();}},
  buildPart:(key,name,status)=>{if(build){build.items.set(key,{name,status});renderMessages();}},
  finishBuild:(label,retry)=>{if(!build)return;clearInterval(buildTimer);build.active=false;build.label=label;build.retry=retry;buildControls(false);messages.push({id:++sequence,role:'assistant',text:label});renderMessages();}
 };

}

export function mountMobileMenu(){
 const bar=document.querySelector('.topbar'),menu=document.createElement('details');menu.className='mobile-menu';
 menu.innerHTML='<summary aria-label="Project menu" title="Project menu">⋯</summary><div class="mobile-menu-content"></div>';
 bar.append(menu);const content=menu.querySelector('.mobile-menu-content');
 const entries=['connect-ai','theme-toggle','snapshots-btn','export-btn'].map(id=>{const node=document.getElementById(id),slot=document.createComment(id+' desktop position');node.before(slot);return {node,slot};});
 const query=matchMedia('(max-width:650px)');
 function arrange(){for(const {node,slot}of entries)if(query.matches)content.append(node);else slot.after(node);menu.open=false;}
 query.addEventListener('change',arrange);arrange();
 menu.addEventListener('click',event=>{if(event.target.closest('button')&&event.target.closest('button').id!=='theme-toggle')menu.open=false;});
 document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.open=false;});
}
