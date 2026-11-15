import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/catalog.js';
import { readSharedDocument } from '../src/sharing.js';
import { projectRoute,projectUrl } from '../src/routes.js';
import { savedProjectUrl } from '../src/saved-projects.js';
import { STORAGE_KEY } from '../src/engine.js';

test('shared URLs are separate from private account and browser projects',()=>{
 const token='c1ab89ea-885a-4a88-bc02-f20add36937d';
 assert.deepEqual(projectRoute('/share/'+token),{id:'shared-'+token,key:'shared-'+token,shared:true,token});
 assert.equal(projectUrl('shared-'+token),'/share/'+token);
 assert.equal(projectRoute('/projects/cloud-'+token).shared,undefined);
 for(const url of ['/share/all','/share/'+token+'/edit','/share/../../projects','/share/------------------------------------'])assert.equal(projectRoute(url),null);
 assert.equal(savedProjectUrl(STORAGE_KEY+':shared-'+token),null);
});
test('shared view validates assembly geometry and excludes private conversation context',()=>{
 const source=defaultState();source.notes=[{part:'thermal',text:'Private note',at:new Date().toISOString()}];source.brief='Private prompt';source.projectLinks=['https://example.com/private'];source.build={status:'running'};source.research={summary:'Private research'};source.decisions={thermal:'Skip'};source.chat=[{text:'Private chat'}];source.apiKey='not-for-sharing';
 const before=structuredClone(source),view=readSharedDocument(source);
 assert.deepEqual(view.instances,source.instances);assert.deepEqual(view.connections,source.connections);
 assert.deepEqual(view.notes,[]);assert.deepEqual(view.decisions,{});assert.deepEqual(view.projectLinks,[]);assert.equal(view.brief,'');
 for(const key of ['research','build','chat','apiKey'])assert.equal(view[key],undefined);
 assert.deepEqual(source,before);
 assert.throws(()=>readSharedDocument({...source,instances:[{id:'thermal',position:[NaN,0,0]}]}),/Invalid/);
});
