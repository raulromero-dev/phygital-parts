import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, validateState } from '../src/engine.js';
import { emptyProject } from '../src/product-data.js';
import { exampleTemplate, phygitalTemplate } from '../src/templates.js';
import { projectRoute, projectUrl } from '../src/routes.js';
import { listSavedProjects, writeSavedProject, createSavedProject, savedProjectUrl, savedProjectsHtml } from '../src/saved-projects.js';
const uuid=()=> '12345678-1234-1234-1234-123456789abc';
function storage(){const data=new Map();return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value))};}
test('discovers old examples, generated builds, original layouts and legacy saves without indexing chat or foreign keys',()=>{
 const s=storage(),state=exampleTemplate('air-monitor');
 for(const key of [STORAGE_KEY,STORAGE_KEY+':air-monitor',STORAGE_KEY+':phygital-wide',STORAGE_KEY+':build-'+uuid()])s.setItem(key,JSON.stringify(state));
 for(const key of [STORAGE_KEY+':air-monitor.chat',STORAGE_KEY+':air-monitor.snapshots','another-app',STORAGE_KEY+':not-a-route'])s.setItem(key,JSON.stringify(state));
 const report=listSavedProjects(s);assert.equal(report.projects.length,4);assert.equal(report.skipped,0);assert.equal(report.unavailable,false);
 assert.equal(savedProjectUrl(STORAGE_KEY+':phygital-wide'),'/projects/phygital?layout=wide');assert.equal(savedProjectUrl(STORAGE_KEY),'/?workspace=1');
});
test('copies to independent local routes and retains parts, connections, notes and safe chat',()=>{
 const s=storage(),original=phygitalTemplate('wide'),key=STORAGE_KEY+':phygital-wide';s.setItem(key,JSON.stringify(original));s.setItem(key+'.chat',JSON.stringify([{role:'user',text:'Move the camera',apiKey:'not-a-real-secret'}]));
 const before=s.getItem(key),result=createSavedProject(s,original,'My prototype',{uuid,sourceKey:key});
 assert.equal(s.getItem(key),before);assert.equal(result.state.name,'My prototype');assert.deepEqual(result.state.instances,original.instances);assert.deepEqual(result.state.connections,original.connections);assert.deepEqual(result.state.notes,original.notes);
 const route=projectRoute(result.url);assert.equal(route.local,true);assert.equal(projectUrl(route.id),result.url);assert.notEqual(result.key,key);
 const chat=JSON.parse(s.getItem(result.key+'.chat'));assert.equal(chat[0].text,'Move the camera');assert.equal(chat[0].apiKey,undefined);
 const restored=validateState(JSON.parse(s.getItem(result.key)));assert.equal(restored.updatedAt,result.state.updatedAt);
});
test('save failure preserves the last saved project and does not create a phantom record',()=>{
 const s=storage(),key=STORAGE_KEY+':air-monitor',state=exampleTemplate('air-monitor');writeSavedProject(s,key,state);const before=s.getItem(key);
 s.setItem=()=>{throw Error('Quota exceeded');};assert.throws(()=>writeSavedProject(s,key,{...state,name:'Unsaved edit'}));assert.equal(s.getItem(key),before);
 assert.throws(()=>createSavedProject(s,state,'New copy',{uuid}));assert.equal(listSavedProjects(s).projects.length,1);
});
test('malformed entries are preserved and do not prevent valid projects from appearing',()=>{
 const s=storage();s.setItem(STORAGE_KEY+':thermal-camera','{bad');const a=exampleTemplate('air-monitor');a.updatedAt='2026-01-01T00:00:00.000Z';s.setItem(STORAGE_KEY+':air-monitor',JSON.stringify(a));
 const b=exampleTemplate('smartwatch');b.updatedAt='2026-02-01T00:00:00.000Z';s.setItem(STORAGE_KEY+':smartwatch',JSON.stringify(b));
 const report=listSavedProjects(s);assert.equal(report.skipped,1);assert.equal(report.projects[0].name,b.name);assert.equal(s.getItem(STORAGE_KEY+':thermal-camera'),'{bad');assert.equal(listSavedProjects(null).unavailable,true);
});
test('imports validate before saving, names are escaped, and project files exclude extra fields',()=>{
 const s=storage();assert.throws(()=>createSavedProject(s,{version:9},'Bad',{uuid}));assert.equal(s.length,0);
 const state=emptyProject();state.apiKey='not-a-real-secret';const result=createSavedProject(s,state,'<img src=x onerror=alert(1)>',{uuid});
 assert.equal(result.state.apiKey,undefined);const html=savedProjectsHtml(listSavedProjects(s));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
 assert.throws(()=>createSavedProject(s,state,'Duplicate',{uuid}));assert.equal(s.length,1);assert.throws(()=>writeSavedProject(s,'foreign',state));
});
