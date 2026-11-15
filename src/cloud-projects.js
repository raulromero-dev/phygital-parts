import { createClient } from '@supabase/supabase-js';
import { validateState, STORAGE_KEY } from './engine.js';
import { cleanChat } from './chat-data.js';
import { createSaveQueue } from './cloud-sync.js';
export const cloudKey=(userId,id)=>`${STORAGE_KEY}:account:${userId}:cloud-${id}`;
export function cloudClient(){
 const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
 return url&&key?createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}}):null;
}
export function mountAccounts(app){
 const client=cloudClient();let user=null,rows=[],active=null,queue=null,timer,epoch=0,initial=true,listError='',lastQueued='';
 const $=s=>document.querySelector(s),button=$('#account-button');
 function notify(){button.textContent=user?'Account':'Sign in';button.title=user?.email||'Save projects with Google';app.refresh();}
 function chat(){try{return cleanChat(JSON.parse(localStorage.getItem(app.key()+'.chat')||'[]'));}catch{return [];}}
 function draft(){return {document:validateState(app.state()),chat:chat()};}
 function status(value){if(active)app.status(value);}
 function cache(value,dirty,revision){if(!active)return;try{localStorage.setItem(active.key+'.sync',JSON.stringify({...value,dirty,revision}));}catch{app.toast('Local backup unavailable. Keep this tab open until account saving finishes.');}}
 async function write(id,value,revision){const {data,error}=await client.rpc('save_project',{p_id:id,p_document:value.document,p_chat:cleanChat(value.chat),p_expected_revision:revision});if(error)throw error;return data[0];}
 function start(row,key){
  queue?.stop();active={id:row.id,key};lastQueued='';
  queue=createSaveQueue({revision:row.revision,write:(value,revision)=>write(row.id,value,revision),onStatus:status,onSaved:(saved,value,newer)=>{if(!newer)cache(value,false,saved.revision);else cache(draft(),true,saved.revision);rows=rows.filter(r=>r.id!==saved.id);rows.unshift(card(saved));notify();}});
 }
 function card(row){return {id:row.id,key:cloudKey(user.id,row.id),url:'/projects/cloud-'+row.id,name:row.name,parts:row.document?.instances?.length??row.parts?.length??0,updatedAt:row.updated_at,account:true};}
 async function refresh(){
  if(!user)return;const current=epoch;
  const {data,error}=await client.from('projects').select('id,name,updated_at,parts:document->instances').order('updated_at',{ascending:false}).limit(200);
  if(current!==epoch)return;listError=error?'Account projects could not load. Try again.':'';if(!error)rows=data.map(card);notify();
 }
 function clear(){epoch++;clearTimeout(timer);queue?.stop();queue=null;active=null;rows=[];lastQueued='';}
 async function openCloud(){
  const route=app.route();if(!route?.cloud)return;
  app.lock(true);app.load(null,STORAGE_KEY+':signed-out',[]);status('loading');
  if(!user){app.gate('Sign in to open this project.',()=>signIn());return;}
  const current=epoch,id=route.id.slice(6),key=cloudKey(user.id,id);
  const {data,error}=await client.from('projects').select('*').eq('id',id).maybeSingle();if(current!==epoch)return;
  let cached;try{cached=JSON.parse(localStorage.getItem(key+'.sync')||'null');}catch{}
  if(error||(!data&&!(cached?.dirty&&cached.revision===null))){app.gate('This project is unavailable for this account.',()=>{refresh();openCloud();},'Try again');return;}
  const remote=data||{id,revision:null};
  const dirty=cached?.dirty&&cached.document;
  try{
   const value=dirty?{document:validateState(cached.document),chat:cleanChat(cached.chat)}:{document:validateState(data.document),chat:cleanChat(data.chat)};
   const interrupted=value.document.build?.status==='running';if(interrupted)value.document.build.status='interrupted';
   // Start only after loading: the chat restore event must not enqueue stale data.
   app.load(value.document,key,value.chat);app.lock(false);start(remote,key);cache(value,!!dirty||interrupted,dirty?cached.revision:remote.revision);lastQueued=JSON.stringify(value);
   if(dirty&&cached.revision!==remote.revision){queue.stop();status('conflict');app.toast('A newer account version exists. Your local edits are kept; save a copy.');}
   else if(dirty||interrupted){queue.enqueue(value);queue.flush();if(interrupted)app.toast('Build interrupted by reload. Your draft parts are saved.');}else status('saved');
  }catch{app.gate('This saved project could not be read. Its data has been kept.',()=>openCloud(),'Try again');}
 }
 async function setUser(next){
  if(!initial&&next?.id===user?.id)return;initial=false;const wasCloud=!!app.route()?.cloud;clear();user=next;notify();
  if(wasCloud){app.lock(true);app.load(null,STORAGE_KEY+':signed-out',[]);}
  if(user){const current=epoch;const {error}=await client.rpc('claim_pending_projects');if(current!==epoch)return;if(error)app.toast('Prepared projects could not be loaded yet. Try refreshing.');await refresh();}
  await openCloud();
 }
 async function signIn(){
  if(!client){app.toast('Account saving is not configured on this installation.');return;}
  try{sessionStorage.setItem('phygital.auth.return',location.pathname+location.search);}catch{}
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/?auth=callback',queryParams:{prompt:'select_account'}}});
  if(error)app.toast('Google sign-in could not start. Try again.');
 }
 async function saveCopy(value,name,history=chat()){
  if(!user)throw Error('Sign in before saving to your account.');
  const owner=user.id,id=crypto.randomUUID(),document=validateState(value);document.name=name.trim();if(!document.name||document.name.length>120)throw Error('Use a name up to 120 characters.');
  const row=await write(id,{document,chat:cleanChat(history)},null);if(user?.id!==owner)throw Error('Account changed. Sign in again to open your saved project.');
  await queue?.flush();queue?.stop();active=null;app.navigate('/projects/cloud-'+id);app.load(document,cloudKey(user.id,id),cleanChat(history));app.lock(false);start(row,cloudKey(user.id,id));cache({document,chat:cleanChat(history)},false,row.revision);lastQueued=JSON.stringify({document,chat:cleanChat(history)});rows.unshift(card(row));status('saved');notify();app.closeDialog();
 }
 function save(){
  if(!queue||!active||app.key()!==active.key)return;
  const value=draft(),json=JSON.stringify(value);if(json===lastQueued)return;lastQueued=json;cache(value,true,queue.revision);queue.enqueue(value);clearTimeout(timer);timer=setTimeout(()=>queue.flush(),600);
 }
 async function accountDialog(){
  if(!user){await signIn();return;}
  app.dialog('Your account',`<p>${app.esc(user.email)}</p><p class="hint">Account projects sync across devices. Browser projects stay here until you save them to your account.</p><div class="dialog-actions"><button class="button" id="account-projects">My projects</button><button class="button" id="sign-out">Sign out</button></div>`);
  $('#account-projects').onclick=app.projects;$('#sign-out').onclick=async()=>{await queue?.flush();if(queue?.dirty){app.toast('Some edits are not synced. Export or save a copy before signing out.');return;}const {error}=await client.auth.signOut({scope:'local'});if(error){app.toast('Sign-out failed. Try again.');return;}location.assign('/');};
 }
 button.onclick=accountDialog;
 document.addEventListener('phygital:chat',save);window.addEventListener('online',()=>queue?.retry());
 window.addEventListener('beforeunload',event=>{if(queue?.dirty){event.preventDefault();event.returnValue='';}});
 if(client){client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>setUser(session?.user||null),0);});client.auth.getSession().then(async({data,error})=>{
   if(error)app.toast('Google sign-in could not finish. Please try again.');
   await setUser(data.session?.user||null);
   if(new URLSearchParams(location.search).get('auth')==='callback'){
    window.history.replaceState({},'','/');let back;try{back=sessionStorage.getItem('phygital.auth.return');sessionStorage.removeItem('phygital.auth.return');}catch{}
    if(data.session&&back?.startsWith('/')&&!back.startsWith('//')&&!back.includes('auth=callback'))location.replace(back);
   }
  });
 }else if(app.route()?.cloud){app.lock(true);app.gate('Account saving is not configured here.',signIn);}
 return {get user(){return user;},get rows(){return rows;},get error(){return listError;},save,saveCopy,signIn,refresh,
  newProject(id){if(!user)throw Error('Sign in first.');const key=cloudKey(user.id,id);start({id,revision:null},key);return key;},
  retry:()=>queue?.retry(),detach(){clearTimeout(timer);queue?.stop();queue=null;active=null;},get dirty(){return queue?.dirty;}};
}
