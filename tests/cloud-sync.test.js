import test from 'node:test';import assert from 'node:assert/strict';
import {createSaveQueue} from '../src/cloud-sync.js';
import {listSavedProjects,writeSavedProject} from '../src/saved-projects.js';
import {projectRoute} from '../src/routes.js';
import {phygitalTemplate} from '../src/templates.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('account save queue serializes writes and flushes edits made during an in-flight write',async()=>{
 const wait=deferred(),calls=[],states=[];const q=createSaveQueue({revision:2,write:async(v,r)=>{calls.push([v,r]);if(calls.length===1)await wait.promise;return {revision:r+1};},onStatus:s=>states.push(s)});
 q.enqueue({name:'first'});const done=q.flush();q.enqueue({name:'newest'});wait.resolve();await done;assert.deepEqual(calls,[[{name:'first'},2],[{name:'newest'},3]]);assert.equal(q.revision,4);assert.equal(q.dirty,false);assert.equal(states.at(-1),'saved');
});
test('conflicts keep the newest draft and cannot retry over a newer revision',async()=>{
 let calls=0,status;const q=createSaveQueue({revision:1,write:async()=>{calls++;throw Error('PROJECT_CONFLICT');},onStatus:s=>status=s});q.enqueue({name:'draft'});await q.flush();q.enqueue({name:'newer draft'});await q.retry();assert.equal(calls,1);assert.equal(q.dirty,true);assert.equal(status,'conflict');
});
test('offline writes retry and canceled account sessions cannot update status from stale responses',async()=>{
 let fail=true;const statuses=[];const q=createSaveQueue({revision:1,write:async()=>{if(fail)throw Error('Network error');return {revision:2};},onStatus:s=>statuses.push(s)});q.enqueue({});await q.flush();assert.equal(statuses.at(-1),'offline');fail=false;await q.retry();assert.equal(statuses.at(-1),'saved');
 const wait=deferred();let saved=false;const q2=createSaveQueue({revision:1,write:()=>wait.promise,onSaved:()=>saved=true});q2.enqueue({});const done=q2.flush();q2.stop();wait.resolve({revision:2});await done;assert.equal(saved,false);
});
test('anonymous project discovery excludes account caches and raw cloud routes',()=>{
 const data=new Map(),storage={get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const id='e72955ad-2cdb-46c0-af4b-c4346060186e',key='phygital.parts.v1:account:12345678-1234-1234-1234-123456789012:cloud-'+id;
 writeSavedProject(storage,key,phygitalTemplate('wide'));assert.equal(listSavedProjects(storage).projects.length,0);assert.equal(projectRoute('/projects/cloud-'+id).cloud,true);assert.throws(()=>writeSavedProject(storage,'phygital.parts.v1:cloud-'+id,phygitalTemplate('wide')));
});
