import { codexMark } from './brand.js';
import { loadingIndicator } from './loading.js';
import { escapeHtml as esc } from './product-data.js';
import { partFor, checks } from './engine.js';
import { portsFor } from './connections.js';
import { applyAdjustments } from './adjustments.js';
import { cleanChat, conversationText } from './chat-data.js';
import { PARTS } from './catalog.js';

export function mountAssistant(app){
 const $=s=>document.querySelector(s);
 let selected=null,pending=false,abort=null,messages=[],sequence=0,build=null,buildTimer,gameOpening=false,projectGeneration=0;
 let historyKey=app.getStorageKey()+'.chat';
 function readHistory(){if(app.isShared?.())return [];try{return cleanChat(JSON.parse(localStorage.getItem(historyKey)||'[]')).map(m=>({...m,id:++sequence}));}catch{return [];}}
 messages=readHistory();
 const root=document.createElement('aside');root.className='codex-chat';root.id='codex-chat';root.hidden=true;root.setAttribute('aria-label','Codex assistant');
 root.innerHTML=`<header class="chat-header"><strong>${codexMark}<span>codex</span></strong><div><button id="chat-game" class="chat-game-trigger" aria-label="Play Cable Hop" title="Play Cable Hop"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h5v8H3zM8 10h3m-3 4h3M2 10H0m2 4H0M11 12c5-8 8 8 13 0" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button id="chat-expand" aria-label="Expand chat" title="Expand chat">⤢</button><button id="chat-minimize" aria-label="Minimize chat" title="Minimize chat">−</button></div></header><div id="chat-messages" class="chat-messages" role="log" aria-label="Chat history" aria-live="polite"></div><div class="chat-compose"><div id="chat-context" class="chat-context"></div><form id="chat-form"><label class="sr-only" for="chat-prompt">Message codex</label><textarea id="chat-prompt" required maxlength="4000" rows="2" placeholder="Adjust this build…"></textarea><div class="chat-send-row"><span id="chat-status">Tap a part to attach it.</span><button type="button" id="chat-stop" hidden>Stop</button><button type="submit" id="chat-send" aria-label="Send message">↑</button></div></form></div>`;
 const launcher=document.createElement('button');launcher.id='ask-codex';launcher.className='codex-launcher';launcher.innerHTML=codexMark+'<span>codex</span>';launcher.setAttribute('aria-controls','codex-chat');launcher.setAttribute('aria-expanded','false');
 document.body.append(root,launcher);
 function open(){root.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');selected=app.getSelected();renderContext();renderMessages();$('#chat-prompt').focus();}
 function minimize(){root.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');}
 async function playGame(){if(gameOpening)return;gameOpening=true;try{const {openCableGame}=await import('./cable-game.js');await openCableGame({getState:app.getState,isBuilding:app.isBuilding});}catch{app.toast('The game could not load. Try again.');}finally{gameOpening=false;}}
 $('#chat-game').onclick=playGame;
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
  const name=id=>{const source=(proposal.additions||[]).find(a=>a.key===id)?.sourceId||id;return partFor(state,source)?.short||PARTS[source]?.short||source;};
  for(const a of proposal.additions||[])lines.push(`Add ${name(a.key)}`);
  for(const id of proposal.removals||[])lines.push(`Remove ${name(id)} and its cables`);
  const bundles=new Set((proposal.connections||[]).map(c=>c.bundle));for(const bundle of bundles)lines.push(`Connect ${bundle||'planned cable'} · ${(proposal.connections||[]).filter(c=>c.bundle===bundle).length} conductors`);
  if(proposal.removeConnections?.length)lines.push(`Remove ${proposal.removeConnections.length} cable conductors`);
  for(const change of proposal.changes){const part=name(change.partId);
   for(const [key,label,unit]of [['position','Move','mm'],['rotation','Rotate','°'],['dimensions','Resize','mm']])if(change[key])lines.push(`${label} ${part}: ${change[key].join(' / ')} ${unit}`);
   if(change.note)lines.push(`Add a note to ${part}`);
  }
  if(proposal.enclosure)lines.push(`Interior: ${proposal.enclosure.join(' × ')} mm`);
  return lines;
 }
 function questionHtml(message){
  const disabled=message.answered||pending||build?.active;
  return `<section class="chat-question" aria-label="Question"><strong>${esc(message.question.prompt)}</strong><div class="chat-choices">${message.question.options.map((option,i)=>`<button type="button" data-chat-answer="${message.id}" data-option="${i}" ${disabled?'disabled':''}>${esc(option)}</button>`).join('')}</div>${message.answered?'<small>Answered</small>':`<details class="chat-other"><summary>Other…</summary><form data-chat-other="${message.id}"><label class="sr-only" for="answer-${message.id}">Your answer</label><input id="answer-${message.id}" maxlength="1000" placeholder="Your answer…" required ${disabled?'disabled':''}><button type="submit" ${disabled?'disabled':''}>Send</button></form></details>`}</section>`;
 }
 function answer(message,text){if(!message||message.answered||pending||build?.active||!text.trim())return;app.ensureKey(()=>{message.answered=true;send(text.trim(),message.target);});}
 function renderMessages(){
  const log=$('#chat-messages');
  log.innerHTML=messages.length?messages.map(message=>`<article class="chat-message ${message.role}">${message.partName?`<small>↳ ${esc(message.partName)}</small>`:''}<p>${esc(message.text)}</p>${message.question?questionHtml(message):''}${message.proposal?`<div class="chat-proposal"><ul>${describe(message.proposal,message.state).map(line=>`<li>${esc(line)}</li>`).join('')}</ul>${message.checks?`<small>${esc(message.checks)}</small>`:''}<button class="button" data-chat-apply="${message.id}" ${message.applied?'disabled':''}>${message.applied?'Applied':'Apply changes'}</button></div>`:''}</article>`).join(''):'<p class="chat-empty">Move a part, adjust the fit, or ask about this assembly.</p>';
  if(build)log.insertAdjacentHTML('beforeend',`<section class="chat-build">${build.active?loadingIndicator(build.label,true):`<p>${esc(build.label)}</p>`}<ul>${[...build.items.values()].map(item=>`<li><span>${esc(item.name)}</span><small>${esc(item.status)}</small></li>`).join('')}</ul><div class="chat-build-footer"><small class="build-elapsed">${Math.floor((Date.now()-build.started)/1000)}s</small>${build.active?'<button type="button" class="chat-play-game" id="build-play-game">Play Cable Hop ↗</button>':''}</div>${!build.active&&build.retry?'<button class="text-button" id="retry-build">Retry build</button>':''}</section>`);
  root.querySelectorAll('[data-chat-answer]').forEach(button=>button.onclick=()=>{const message=messages.find(m=>m.id===+button.dataset.chatAnswer);answer(message,message.question.options[+button.dataset.option]);});
  root.querySelectorAll('[data-chat-other]').forEach(form=>form.onsubmit=event=>{event.preventDefault();answer(messages.find(m=>m.id===+form.dataset.chatOther),form.querySelector('input').value);});
  $('#build-play-game')?.addEventListener('click',playGame);
  $('#retry-build')?.addEventListener('click',()=>build.retry());
  if(pending)log.insertAdjacentHTML('beforeend',`<div class="chat-thinking">${loadingIndicator('Reviewing your assembly…',true)}</div>`);
  root.querySelectorAll('[data-chat-apply]').forEach(button=>button.onclick=()=>{
   const message=messages.find(m=>m.id===+button.dataset.chatApply);
   try{app.applyAdjustment(message.proposal,message.base);message.applied=true;renderMessages();app.toast('Changes applied. Undo is available.');}catch(error){app.toast(error.message);}
  });
  log.scrollTop=log.scrollHeight;
  try{if(!app.isShared?.())localStorage.setItem(historyKey,JSON.stringify(cleanChat(messages)));}catch{}
  document.dispatchEvent(new CustomEvent('phygital:chat',{detail:{key:historyKey,chat:cleanChat(messages)}}));
 }
 async function send(prompt,target){
  if(pending||build?.active)return;
  const generation=projectGeneration;
  const state=structuredClone(app.getState());if(!state.instances.length){app.toast('Add a part before asking for adjustments.');return;}
  if(target&&!state.instances.some(p=>p.id===target))target=null;
  const previous=messages.map(m=>({role:m.role,text:conversationText(m)})).slice(-8);
  messages.push({id:++sequence,role:'user',text:prompt,partName:target?partFor(state,target)?.short:null});$('#chat-prompt').value='';pending=true;abort=new AbortController();$('#chat-send').disabled=true;$('#chat-stop').hidden=false;$('#chat-status').textContent='Working on your request';renderMessages();
  try{
   const context={name:state.name,enclosure:state.enclosure,lockCore:state.lockCore,parts:state.instances.map(instance=>{const part=partFor(state,instance.id);return {...instance,name:part.name,interface:part.interface,electrical:part.electrical,placement:part.placement,ports:portsFor(state,instance.id)};}),connections:state.connections};
   const response=await fetch('/api/adjust',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+app.getKey()},body:JSON.stringify({prompt,selectedPartId:target,context,history:previous}),signal:abort.signal});
   const result=await response.json();if(!response.ok)throw Error(result.error||'The assistant could not finish.');
   if(generation!==projectGeneration)return;
   const proposal=result.proposal,hasChanges=proposal.additions?.length||proposal.removals?.length||proposal.connections?.length||proposal.removeConnections?.length||proposal.enclosure||proposal.changes.some(c=>c.position||c.rotation||c.dimensions||c.note);
   const message={id:++sequence,role:'assistant',text:proposal.message,...(proposal.question?{question:proposal.question,target,answered:false}:{})};
   if(hasChanges){const preview=applyAdjustments(state,proposal);const warnings=checks(preview).filter(c=>c.level==='warn');Object.assign(message,{proposal,state,base:JSON.stringify(state),checks:warnings.length?`${warnings.length} assembly checks need review after this change.`:'Review the proposed changes before applying.'});}
   messages.push(message);
  }catch(error){if(generation!==projectGeneration)return;messages.push({id:++sequence,role:'assistant',text:error.name==='AbortError'?'Stopped. Your assembly is unchanged.':error.message});}
  finally{if(generation!==projectGeneration)return;pending=false;abort=null;$('#chat-send').disabled=false;$('#chat-stop').hidden=true;$('#chat-status').textContent='Tap a part to attach it.';renderMessages();}
 }
 $('#chat-form').onsubmit=event=>{event.preventDefault();const prompt=$('#chat-prompt').value.trim(),target=selected;if(!prompt||pending||build?.active)return;app.ensureKey(()=>{const question=[...messages].reverse().find(m=>m.question&&!m.answered);if(question)question.answered=true;send(prompt,target||question?.target);});};
 $('#chat-prompt').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#chat-form').requestSubmit();}});
 $('#chat-stop').onclick=()=>build?.active?build.cancel():abort?.abort();
 document.addEventListener('phygital:selection',event=>{selected=event.detail.id;renderContext();});
 document.addEventListener('phygital:state',()=>renderContext());
 document.addEventListener('phygital:project',()=>{projectGeneration++;abort?.abort();pending=false;clearInterval(buildTimer);build=null;selected=null;historyKey=app.getStorageKey()+'.chat';messages=readHistory();buildControls(false);renderMessages();renderContext();});
 function buildControls(active){$('#chat-send').disabled=active;$('#chat-prompt').disabled=active;$('#chat-stop').hidden=!active;$('#chat-status').textContent=active?'Building your project':'Tap a part to attach it.';}
 return {open,minimize,
  beginBuild:(prompt,cancel)=>{messages.push({id:++sequence,role:'user',text:prompt.slice(0,4000)});build={active:true,label:'Finding your parts…',started:Date.now(),items:new Map(),cancel};buildControls(true);open();clearInterval(buildTimer);buildTimer=setInterval(()=>{const elapsed=root.querySelector('.build-elapsed');if(elapsed&&build)elapsed.textContent=Math.floor((Date.now()-build.started)/1000)+'s';},1000);},
  updateBuild:label=>{if(build){build.label=label;renderMessages();}},
  buildPart:(key,name,status)=>{if(build){build.items.set(key,{name,status});renderMessages();}},
  finishBuild:(label,retry)=>{if(!build)return;clearInterval(buildTimer);build.active=false;build.label=label;build.retry=retry;buildControls(false);messages.push({id:++sequence,role:'assistant',text:label});renderMessages();}
 };

}

export function mountWorkspaceMenu(){
 const bar=document.querySelector('.topbar'),menu=document.createElement('details');menu.className='mobile-menu';
 menu.innerHTML='<summary aria-label="Project menu" title="Project menu">⋯</summary><div class="mobile-menu-content"></div>';
 bar.append(menu);const content=menu.querySelector('.mobile-menu-content');
 const entries=['account-button','connect-ai','theme-toggle','snapshots-btn','export-btn','undo-btn','redo-btn'].map(id=>document.getElementById(id));
 for(const node of entries){content.append(node);if(['undo-btn','redo-btn'].includes(node.id))node.insertAdjacentHTML('beforeend','<span>'+node.getAttribute('aria-label')+'</span>');}
 menu.addEventListener('click',event=>{if(event.target.closest('button')&&event.target.closest('button').id!=='theme-toggle')menu.open=false;});
 document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')menu.open=false;});
}
