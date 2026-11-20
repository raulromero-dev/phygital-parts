import { validateState, STORAGE_KEY } from './engine.js';

// Shared documents come from an explicitly published snapshot, not a cloud
// project's private row. Validate again before passing data to the renderer.
export function readSharedDocument(value){
 const state=validateState(value);
 state.notes=[];state.decisions={};state.brief='';state.projectLinks=[];
 delete state.research;delete state.build;
 delete state.layouts; // Publish only the active assembly, never private alternatives.
 delete state.firmware; // Imported code and private preview bindings are not shared.
 return state;
}

export function mountSharing(app,accounts){
 const $=s=>document.querySelector(s);
 let busy=false,loaded=false;
 const isShared=()=>!!app.route()?.shared;
 const token=()=>app.route().token;
 const shareUrl=value=>location.origin+'/share/'+value;
 const fail=error=>app.toast(/PROJECT_CONFLICT/.test(error.message)?'Save a copy of your conflicting edits before sharing.':error.message||'Sharing is unavailable. Try again.');
 async function copy(url){try{await navigator.clipboard.writeText(url);app.toast('Share link copied.');}catch{app.toast('Select and copy the link below.');}}
 async function performRemix(){
  if(busy)return;busy=true;const button=$('#confirm-remix');if(button){button.disabled=true;button.textContent='Creating your copy…';}
  try{await accounts.remix(token());app.toast('Your remix is saved to your account.');}
  catch(error){fail(error);if(button){button.disabled=false;button.textContent='Remix project';}}
  finally{busy=false;}
 }
 function remix(){
  if(!isShared())return;if(!loaded){app.toast('Wait for the shared project to open.');return;}
  app.dialog('Remix this project',`<p class="dialog-intro">Make your own copy. Changes stay in your account.</p><button class="button primary" id="confirm-remix">${accounts.user?'Remix project':'Sign in with Google'}</button>`);
  $('#confirm-remix').onclick=async()=>{
   if(accounts.user){await performRemix();return;}
   try{sessionStorage.setItem('phygital.share.remix',token());}catch{app.toast('Sign in, then choose Remix again.');}
   await accounts.signIn();
  };
 }
 async function open(){
  if(!isShared())return;const expected=token();
  try{
   const rows=await accounts.rpc('get_shared_project',{p_token:expected});
   if(!isShared()||token()!==expected)return;
   if(!rows?.length)throw Error('This link is unavailable or has been turned off.');
   app.load(readSharedDocument(rows[0].document),STORAGE_KEY+':shared-'+expected,[]);
   loaded=true;app.lock(false);app.status('Shared view');
   await accounts.ready;
   let intent;try{intent=sessionStorage.getItem('phygital.share.remix');if(intent===expected)sessionStorage.removeItem('phygital.share.remix');}catch{}
   if(intent===expected&&accounts.user)await performRemix();
  }catch(error){app.unavailable(error.message);}
 }
 async function share(){
  if(busy)return;
  if(isShared()){
   app.dialog('Share project',`<p class="dialog-intro">Anyone with this link can view and remix this version.</p><label for="share-url">Share link</label><div class="share-link-row"><input id="share-url" readonly value="${app.esc(shareUrl(token()))}"><button class="button primary" id="copy-share">Copy link</button></div>`);
   $('#copy-share').onclick=()=>copy(shareUrl(token()));return;
  }
  if(!app.canShare())return;
  if(!accounts.user){
   app.dialog('Share project','<p class="dialog-intro">Sign in to publish a link. Visitors can view it without an account.</p><button class="button primary" id="share-sign-in">Sign in with Google</button>');
   $('#share-sign-in').onclick=accounts.signIn;return;
  }
  busy=true;let existing;
  try{existing=await accounts.sharedVersion();}catch(error){fail(error);busy=false;return;}busy=false;
  app.dialog('Share project',`<p class="dialog-intro">Anyone with the link can view and remix this version.</p><p class="hint share-privacy">Includes this layout’s parts, placement and cable details. Other layouts, chat and private notes stay private.</p>${existing?`<label for="share-url">Share link</label><div class="share-link-row"><input id="share-url" readonly value="${app.esc(shareUrl(existing.token))}"><button class="button primary" id="copy-share">Copy link</button></div><div class="dialog-actions"><button class="button" id="publish-share">Update shared version</button><button class="text-button" id="revoke-share">Turn off link</button></div>`:'<button class="button primary" id="publish-share">Create share link</button>'}<p class="hint share-status" id="share-status" role="status">${existing?'Edits stay private until you update the shared version.':''}</p>`);
  $('#copy-share')?.addEventListener('click',()=>copy(shareUrl(existing.token)));
  $('#publish-share').onclick=async()=>{
   if(busy)return;busy=true;const button=$('#publish-share');button.disabled=true;$('#share-status').textContent='Publishing…';
   try{await accounts.publish();busy=false;await share();app.toast('Shared version published.');}
   catch(error){busy=false;button.disabled=false;$('#share-status').textContent=error.message;fail(error);}
  };
  $('#revoke-share')?.addEventListener('click',async()=>{
   if(busy)return;busy=true;
   try{await accounts.revokeShare();busy=false;await share();app.toast('Link turned off. Existing remixes stay with their owners.');}
   catch(error){busy=false;fail(error);}
  });
 }
 $('#share-btn').onclick=share;$('#remix-btn').onclick=remix;
 open();
 return {remix,isShared};
}
