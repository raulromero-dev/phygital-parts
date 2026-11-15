import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exampleTemplate } from '../src/templates.js';
import { validateState, checks } from '../src/engine.js';
import { libraryPart, linksFor } from '../src/product-data.js';
import { PARTS } from '../src/catalog.js';
import { portsFor, INTERNALS } from '../src/connections.js';

test('makeup cyberdeck keeps integrated electronics and mechanical concepts distinct',()=>{
 const s=validateState(JSON.parse(JSON.stringify(exampleTemplate('makeup-cyberdeck'))));
 assert.deepEqual(s.instances.map(p=>p.id),['cardputer-adv','compact-base','compact-hinge','compact-lid','compact-mirror']);
 assert.equal(s.connections.length,0);assert.ok(!s.instances.some(p=>p.id==='xiao'||p.id==='thermal'));
 assert.ok(checks(s).some(c=>c.title==='Compact case needs mechanical review'));
 assert.ok(checks(s).some(c=>c.level==='warn'&&c.ids.includes('compact-hinge')),'unresolved hinge interference remains visible');
 for(const p of s.instances){const bytes=readFileSync(new URL('../public/models/'+p.id+'.glb',import.meta.url));assert.equal(bytes.toString('ascii',0,4),'glTF');}
});
test('Cardputer ports and source links survive duplication without inventing battery leads',()=>{
 const s=exampleTemplate('makeup-cyberdeck'),ports=portsFor(s,'cardputer-adv');
 assert.equal(ports.find(p=>p.id==='5v').rail,'5');assert.equal(ports.find(p=>p.id==='g2').rail,'3.3');assert.equal(ports.some(p=>p.rail==='cell'),false);
 assert.ok(INTERNALS['cardputer-adv'].some(p=>p.name.includes('Keyboard')));
 assert.match(linksFor(PARTS['cardputer-adv'])[0][1],/cardputer-adv-version/);
 const copy=libraryPart(s,'cardputer-adv'),clean=validateState(s);
 assert.equal(clean.custom.find(p=>p.id===copy).modelId,'cardputer-adv');assert.equal(portsFor(clean,copy).length,ports.length);
});
