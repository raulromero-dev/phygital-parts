import { cleanChat } from './chat-data.js';
import { STORAGE_KEY, validateState } from './engine.js';
import { projectRoute, projectUrl } from './routes.js';
import { escapeHtml as esc } from './product-data.js';

export function savedProjectUrl(key){
 if(key===STORAGE_KEY)return '/?workspace=1';
 if(!key.startsWith(STORAGE_KEY+':'))return null;
 const id=key.slice(STORAGE_KEY.length+1);
 const account=id.match(/^account:[a-f0-9-]{36}:(cloud-[a-f0-9-]{36})$/);if(account)return projectUrl(account[1]);
 if(id.startsWith('cloud-'))return null;
 if(/^phygital-(compact|bench|wide)$/.test(id))return projectUrl('phygital',id.slice(9));
 for(const path of ['/projects/'+id,'/examples/'+id])if(projectRoute(path))return path;
 return null;
}

// Discover existing autosaves directly, including projects made before the
// library existed. No separate index can drift out of sync or lose a project.
export function listSavedProjects(storage){
 const projects=[];let skipped=0;
 try{
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i),url=key&&savedProjectUrl(key);if(!url||key.includes(':account:'))continue;
   try{
    const raw=JSON.parse(storage.getItem(key)),state=validateState(raw);
    if(key===STORAGE_KEY&&!state.instances.length&&!state.brief)continue;
    projects.push({key,url,name:state.name,parts:state.instances.length,updatedAt:Number.isFinite(Date.parse(raw.updatedAt))?raw.updatedAt:null});
   }catch{skipped++;}
  }
 }catch{return {projects:[],unavailable:true,skipped};}
 projects.sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||a.name.localeCompare(b.name));
 return {projects,unavailable:false,skipped};
}

export function writeSavedProject(storage,key,state){
 if(!savedProjectUrl(key))throw Error('Unknown project location.');
 const updatedAt=new Date().toISOString();
 // setItem is atomic: a quota error leaves the previous saved project intact.
 storage.setItem(key,JSON.stringify({...state,updatedAt}));
 return updatedAt;
}

export function createSavedProject(storage,value,name,{uuid=()=>crypto.randomUUID(),sourceKey}={}){
 const state=validateState(value);state.name=name.trim();
 if(!state.name||state.name.length>120)throw Error('Use a project name up to 120 characters.');
 if(state.build?.status==='running')state.build.status='interrupted';
 const id='local-'+uuid(),url=projectUrl(id),key=STORAGE_KEY+':'+id;
 if(storage.getItem(key)!==null)throw Error('Could not create a unique project. Please try again.');
 state.updatedAt=writeSavedProject(storage,key,state);
 // Chat is a separate local record. Copy only its known fields, never secrets
 // or arbitrary properties from storage; snapshots remain with their original.
 let chatCopied=true;
 if(sourceKey&&savedProjectUrl(sourceKey))try{
  const history=JSON.parse(storage.getItem(sourceKey+'.chat')||'[]');
  const chat=cleanChat(history);
  if(chat.length)storage.setItem(key+'.chat',JSON.stringify(chat));
 }catch{chatCopied=false;}
 return {key,url,state,chatCopied};
}

export function savedProjectsHtml(report,currentKey){
 const unavailable=report.unavailable?'<p class="saved-projects-note" role="status">Browser storage is unavailable. Export your project to keep a copy.</p>':'';
 const rows=report.projects.map(p=>{
  const date=p.updatedAt?new Date(p.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Saved earlier';
  return `<a class="saved-project-card" href="${esc(p.url)}" ${p.key===currentKey?'aria-current="page"':''}><span class="saved-project-symbol" aria-hidden="true">▦</span><span><strong>${esc(p.name)}</strong><small>${p.parts} ${p.parts===1?'part':'parts'} · ${esc(date)} · ${p.account?'Account':'This browser'}${p.key===currentKey?' · Current':''}</small></span><span class="saved-project-arrow" aria-hidden="true">↗</span></a>`;
 }).join('');
 return `${unavailable}${report.error?`<p class="saved-projects-note">${esc(report.error)}</p>`:''}<div class="saved-project-list">${rows||'<p class="saved-projects-note">Your saved projects will appear here.</p>'}</div>${report.skipped?'<p class="saved-projects-note" role="status">Some older saves could not be read. Their stored files have been kept.</p>':''}`;
}
