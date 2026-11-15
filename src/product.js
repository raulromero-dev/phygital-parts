import { runProjectBuild } from './project-build.js';
import { mountAssistant, mountMobileMenu } from './assistant.js';
import { projectUrl } from './routes.js';
import { library, escapeHtml as esc, safeUrl, purchaseHtml, applyProposal } from './product-data.js';
import { PORTS } from './connections.js';
import { partFor } from './engine.js';
import { EXAMPLES } from './templates.js';
import { circuitBackdrop, codexMark } from './brand.js';
import { loadingIndicator } from './loading.js';
import { readResearchResponse, RESEARCH_PHASES } from './research-progress.js';
import './product.css';

// Deliberately tab-memory only: credentials never enter localStorage, project
// exports, snapshots, URLs or analytics. Reloading the page disconnects AI.
let apiKey='';
export function mountProduct(app){
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 let image=null,controller=null,researchResult=null,lastRequest=null,assistant;
 const home=document.createElement('section');home.className='product-home';home.id='product-home';
 home.innerHTML=`${circuitBackdrop}<div class="home-intro"><h1>Find the parts.<br>Make them fit<img class="hero-board" src="/brand-board.svg" alt="" aria-hidden="true" draggable="false"></h1></div>
 <form id="idea-form" class="idea-composer"><label class="sr-only" for="idea-prompt">Describe what you want to build</label><textarea id="idea-prompt" required maxlength="8000" rows="4" placeholder="Describe an idea, add a photo, or share part links…"></textarea><div id="idea-attachment" class="idea-attachment" hidden></div><div class="composer-actions"><div><button type="button" class="attach-button" id="attach-image" title="Add a reference photo">＋ Photo</button></div><div><button type="submit" class="button primary start-building" disabled>Start building <span aria-hidden="true">↗</span></button></div></div><input type="file" id="idea-image" accept="image/png,image/jpeg,image/webp" hidden></form>

 <div class="idea-examples" role="group" aria-label="Prebuilt examples">${EXAMPLES.map(example=>`<button data-template="${example.id}" title="Explore a prebuilt ${example.label.toLowerCase()}">${example.label} <span aria-hidden="true">↗</span></button>`).join('')}</div>
 <div class="home-secondary"><button id="continue-project" class="text-button" hidden>Continue project →</button></div>
`;
 $('.topbar').after(home);
 $('.toolbar-actions').insertAdjacentHTML('afterbegin','<button class="button ai-connect" id="connect-ai">Connect key</button>');
 if(app.route?.id==='phygital')$('.project-meta').insertAdjacentHTML('afterend','<div class="project-origin"><a href="https://github.com/raulromero-dev/phygital" target="_blank" rel="noopener noreferrer">Device repository ↗</a><a href="https://phygital-studio.vercel.app/" target="_blank" rel="noopener noreferrer">Original workbench ↗</a></div>');
 $('.brand').onclick=e=>{e.preventDefault();showHome();};$('#connect-ai').onclick=()=>connect();
 function showHome(){if(app.route){location.assign('/');return;}document.body.dataset.route='home';$('#continue-project').hidden=!app.getState().instances.length&&!app.continueUrl;home.hidden=false;$('#idea-prompt').focus();}
 function showWorkspace(){document.body.dataset.route='workspace';document.title=app.getState().name+' · phygital';home.hidden=true;app.resize();}
 $('#continue-project').onclick=()=>app.continueUrl?location.assign(app.continueUrl):showWorkspace();
 $$('[data-template]').forEach(button=>button.onclick=()=>{
  const example=EXAMPLES.find(item=>item.id===button.dataset.template);
  location.assign(projectUrl(example.id));
 });
 $('#idea-prompt').addEventListener('input',()=>{$('.start-building').disabled=!$('#idea-prompt').value.trim();});
 $('#attach-image').onclick=()=>$('#idea-image').click();
 $('#idea-image').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){app.toast('Choose a PNG, JPG or WebP image up to 2 MB.');event.target.value='';return;}
  image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  $('#idea-attachment').hidden=false;$('#idea-attachment').innerHTML=`<img src="${image}" alt="Your reference image"><span>${esc(file.name)}</span><button type="button" id="remove-image" aria-label="Remove reference image">×</button>`;
  $('#remove-image').onclick=()=>{image=null;$('#idea-image').value='';$('#idea-attachment').hidden=true;};
 };
 function readLinks(value){const links=value.split(/\s+/).filter(Boolean);if(links.length>5||links.some(link=>!safeUrl(link)))throw Error('Use up to five complete http(s) links.');return links;}
 $('#idea-form').onsubmit=e=>{e.preventDefault();try{const request={mode:'project',prompt:$('#idea-prompt').value.trim(),links:readLinks([...new Set(($('#idea-prompt').value.match(/https?:\/\/[^\s<>"']+/g)||[]).map(url=>url.replace(/[.,;]+$/,'')))].join(' ')),images:image?[image]:[]};if(!request.prompt){$('#idea-prompt').focus();app.toast('Describe what you want to build.');return;}research(request);}catch(error){app.toast(error.message);}};
 function connect(after){
  app.dialog('Connect codex',`<form id="connect-form"><p class="dialog-intro">Use your own OpenAI API key for part research and assembly proposals.</p><label for="openai-key">OpenAI API key</label><input id="openai-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…" required><p class="hint">Your key stays in this tab’s memory and is sent through this app’s server only to OpenAI when you make a request. It is never saved with your projects. OpenAI bills your API account for research, image models and chat.</p><p class="hint">Prompts, attached photos, project links and relevant assembly details are sent to OpenAI for research and requested adjustments. Only send material you want to share.</p><div class="dialog-actions">${apiKey?'<button class="button" type="button" id="disconnect-ai">Disconnect</button>':''}<button class="button primary" type="submit">${after?'Connect & continue':'Connect key'}</button></div><p><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">Get an OpenAI API key ↗</a></p></form>`);
  $('#connect-form').onsubmit=e=>{e.preventDefault();const key=$('#openai-key').value.trim();if(!/^sk-[A-Za-z0-9_-]{16,512}$/.test(key)){app.toast('Enter a valid OpenAI API key beginning with sk-.');return;}apiKey=key;$('#openai-key').value='';$('#connect-ai').textContent='Key connected';$('#dialog').close();if(after)after();};
  $('#disconnect-ai')?.addEventListener('click',()=>{apiKey='';$('#connect-ai').textContent='Connect key';$('#dialog').close();app.toast('API key removed from this tab.');});
  $('#openai-key').focus();
 }
 function context(){const s=app.getState();return {name:s.name,enclosure:s.enclosure,parts:s.instances.map(i=>{const p=partFor(s,i.id);return {id:i.id,name:p.name,dimensions:i.dimensions,position:i.position,interface:p.interface,ports:PORTS[i.id]||p.ports||[]};}),connections:s.connections};}
 async function research(request){
  if(controller)return;
  if(request.mode==='project'){
   const current=new AbortController();controller=current;
   try{const data=await runProjectBuild({app:{...app,startProject:()=>{app.startProject();showWorkspace();}},assistant,request,getKey:()=>apiKey,controller:current,retry:()=>research(request),ensureKey:()=>new Promise(resolve=>{connect(()=>resolve(true));$('#dialog').addEventListener('close',()=>resolve(!!apiKey),{once:true});})});if(data)researchResult=data;}finally{controller=null;}return;
  }
  if(!apiKey){connect(()=>research(request));return;}
  lastRequest=request;const current=new AbortController();controller=current;const started=Date.now();
  app.dialog('Researching your parts',`<div class="research-progress">${loadingIndicator('Finding parts…')}<div class="research-actions"><span id="research-elapsed">0s</span><button class="text-button" id="cancel-research">Cancel</button></div></div>`);
  const progressRoot=$('.research-progress'),cancel=()=>current.abort();$('#cancel-research').onclick=cancel;$('#dialog').addEventListener('close',cancel,{once:true});
  const timer=setInterval(()=>{const el=progressRoot.querySelector('#research-elapsed');if(el)el.textContent=`${Math.floor((Date.now()-started)/1000)}s`;},1000);
  const update=({phase})=>{if(!current.signal.aborted)progressRoot.querySelector('.cable-escape-label').textContent=RESEARCH_PHASES[phase];};
  try{
   const response=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',Authorization:'Bearer '+apiKey},body:JSON.stringify({...request,context:context(),catalog:library.map(p=>({id:p.id,name:p.name,dimensions:p.dimensions,interface:p.interface,ports:PORTS[p.id]||[]}))}),signal:current.signal});
   const data=await readResearchResponse(response,update);if(current.signal.aborted)return;researchResult=data;showProposal(data,false);
  }catch(error){
   if(current.signal.aborted)$('#dialog').close();
   else{app.dialog('Research needs another try',`<p role="alert">${esc(error.message)}</p><button class="button" id="retry-research">Try again</button>`);$('#retry-research').onclick=()=>research(lastRequest);}
  }finally{clearInterval(timer);$('#dialog').removeEventListener('close',cancel);if(controller===current)controller=null;}
 }
 function showProposal(data,replace){
  const p=data.proposal;
  app.dialog(replace?'Your first assembly':'Parts to consider',`<div class="proposal-intro"><span class="eyebrow">REVIEW BEFORE ADDING</span><h3>${esc(p.projectName)}</h3><p>${esc(p.summary)}</p></div><div class="proposal-parts">${p.parts.map(part=>`<article class="proposal-card"><label class="proposal-select"><input type="checkbox" name="proposal-part" value="${esc(part.key)}" checked><span><strong>${esc(part.name)}</strong><small>${part.dimensions.width} × ${part.dimensions.depth} × ${part.dimensions.height} mm · ${part.dimensions.confidence==='sourced'?'Source dimensions · verify':'Estimated envelope'}</small></span></label>${purchaseHtml(part)}<details><summary>Details & connections</summary><p>${esc(part.description)}</p><p>${esc(part.placement)}</p><p>${esc(part.electrical)}</p><p>${esc(part.interface)}</p>${part.sources.map(s=>`<a href="${esc(safeUrl(s.url)||'#')}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}</details></article>`).join('')}</div>${p.connections.length?`<details class="proposal-wires"><summary>${p.connections.length} proposed conductors · review pinouts</summary>${p.connections.map(c=>`<p><strong>${esc(c.fromPart)} / ${esc(c.fromPort)}</strong> → <strong>${esc(c.toPart)} / ${esc(c.toPort)}</strong><br>${esc(c.type)} · ${esc(c.note)}</p>`).join('')}</details>`:''}${p.questions.length?`<section class="proposal-questions"><h4>Before you build</h4><ul>${p.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul></section>`:''}<details class="proposal-sources"><summary>Research sources (${p.sources.length})</summary>${p.sources.map(s=>`<a href="${esc(safeUrl(s.url)||'#')}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}</details><div class="proposal-footer"><p>Review dimensions and pinouts before building.</p><button class="button primary" id="apply-proposal" ${p.parts.length?'':'disabled'}>${replace?'Create assembly':'Add selected parts'} ↗</button></div>`);
  $('#dialog').classList.add('parts-dialog');
  $('#apply-proposal').onclick=()=>{
   const keys=$$('input[name="proposal-part"]:checked').map(el=>el.value);if(!keys.length){app.toast('Select at least one part.');return;}
   try{const next=applyProposal(app.getState(),p,keys,{replace});app.replace(next.state,next.selected);$('#dialog').close();showWorkspace();app.fit();app.toast(next.skippedConnections?`Parts added; ${next.skippedConnections} unmatched cables need manual mapping.`:'Parts added. Review fit, contacts and power before building.');}catch(error){app.toast(error.message);}
  };
 }
 function findParts(tab='library'){
  if(app.isBuilding()){app.toast('Finish or stop the build before adding parts.');return;}
  app.dialog('Find parts',`<div class="finder-tabs" role="tablist" aria-label="Part discovery"><button role="tab" aria-selected="${tab==='library'}" data-finder="library">Library</button><button role="tab" aria-selected="${tab==='ai'}" data-finder="ai">${codexMark} codex</button><button role="tab" aria-selected="${tab==='link'}" data-finder="link">Paste a link</button></div><div id="finder-content"></div>`);$('#dialog').classList.add('parts-dialog');
  $$('[data-finder]').forEach(b=>b.onclick=()=>findParts(b.dataset.finder));
  if(tab==='library'){
   $('#finder-content').innerHTML=`<div class="finder-search"><label class="sr-only" for="catalog-search">Search part library</label><input id="catalog-search" type="search" placeholder="Search parts…"><button class="button" id="finder-custom">Add manually</button></div><div class="category-chips">${['All','Controllers','Displays','Sensors','Power','Haptics','Cables'].map((name,i)=>`<button data-category="${name}" class="${i?'':'active'}">${name}</button>`).join('')}</div><div id="catalog-results" class="catalog-results"></div>`;
   let category='All';const matches={Controllers:p=>['xiao','expansion','crowpanel-advance-28','cardputer-adv'].includes(p.id),Displays:p=>p.kind==='screen'||/lcd-|oled-|crowpanel/.test(p.id),Sensors:p=>['thermal','rf','grove-scd41'].includes(p.id),Power:p=>p.kind==='battery'||p.id==='charger',Haptics:p=>/haptic|motor|mosfet|driver/.test(p.id),Cables:p=>['connector','headers','antenna','strip'].includes(p.kind)};
   const update=()=>{
    const query=$('#catalog-search').value.toLowerCase(),parts=library.filter(p=>(category==='All'||matches[category](p))&&(p.name+' '+p.interface+' '+p.kind).toLowerCase().includes(query));
    $('#catalog-results').innerHTML=parts.length?parts.map(p=>`<article class="catalog-card"><div class="catalog-card-top"><span class="catalog-glyph" aria-hidden="true">${{battery:'▥',motor:'◉',camera:'◎',connector:'⌁',chip:'▦'}[p.kind]||'▤'}</span><span class="catalog-label">${['xiao','lcd-27579','oled-938','mosfet-1','crowpanel-advance-28','cardputer-adv'].includes(p.id)?'Manufacturer CAD':'Planning model'}</span></div><h3>${esc(p.name)}</h3><p class="catalog-dimensions">${p.dimensions[0]} × ${p.dimensions[2]} × ${p.dimensions[1]} mm</p><details class="catalog-details"><summary>Details</summary><p>${esc(p.interface)}</p></details>${purchaseHtml(p)}<button class="button full" data-add-library="${p.id}">＋ Add to assembly</button></article>`).join(''):`<div class="catalog-empty"><h3>Not in the library yet.</h3><p>Describe a part or paste a link.</p><button class="button primary" id="search-beyond">${codexMark} codex</button></div>`;
    $$('[data-add-library]').forEach(b=>b.onclick=async()=>{app.addLibrary(b.dataset.addLibrary);b.textContent='✓ Added · add another';app.toast('Part added to your assembly.');});
    $('#search-beyond')?.addEventListener('click',()=>{const q=$('#catalog-search').value;findParts('ai');$('#parts-prompt').value=q;});
   };$('#catalog-search').oninput=update;$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;$$('[data-category]').forEach(el=>el.classList.toggle('active',el===b));update();});$('#finder-custom').onclick=app.custom;update();
  }else{
   $('#finder-content').innerHTML=`<form id="parts-research-form" class="parts-research-form">${tab==='link'?'<label for="parts-link">Product link</label><input id="parts-link" type="url" required placeholder="https://…">':''}<label for="parts-prompt">${tab==='link'?'What would you like to check?':'What are you looking for?'}</label><textarea id="parts-prompt" rows="3" maxlength="8000" ${tab==='ai'?'required':''} placeholder="e.g. A small display, no soldering"></textarea><button class="button primary" type="submit">${tab==='link'?'Research this link ↗':codexMark+' codex'}</button></form>`;
   $('#parts-research-form').onsubmit=e=>{e.preventDefault();const link=$('#parts-link')?.value.trim();research({mode:tab==='link'?'link':'parts',prompt:$('#parts-prompt').value.trim()||(link?'Identify this exact part and how it could fit the current assembly.':''),links:link?[link]:[],images:[]});};
  }
 }
 function reviewResearch(){if(researchResult)showProposal(researchResult,false);else findParts('ai');}
 $('#find-parts').onclick=()=>findParts();$('#empty-find').onclick=()=>findParts();assistant=mountAssistant({...app,getKey:()=>apiKey,ensureKey:next=>apiKey?next():connect(next)});
 mountMobileMenu();
 app.register({findParts,showHome,showWorkspace,reviewResearch});
 if(app.route){showWorkspace();app.fit();}else showHome();
}
