import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../src/catalog.js';
import { endpoint, connectionIssues, activeConnections, connectionCsv } from '../src/connections.js';
const cable=(from,to)=>({id:'test',from,to,type:'Hook-up wire',bundle:'Test',length:100,color:'#47a6a0',status:'Planned',note:''});
test('every seeded contact exists and the bench preset selects its actual antenna',()=>{for(const preset of ['compact','bench']){const s=defaultState(preset);for(const c of s.connections){assert(endpoint(s,c.from));assert(endpoint(s,c.to));}assert.equal(s.connections.at(-1).to,preset==='bench'?'rod:rf':'strip:rf');}});
test('power-to-ground, crossed I2C, cell-to-3v3 and GPIO-to-motor are flagged',()=>{
 const s=defaultState();for(const [a,b,re]of [['xiao:3v3','xiao:gnd',/short/],['xiao:d4','thermal:scl',/crossed/],['battery:positive','xiao:3v3',/rails differ/],['xiao:d0','motor:positive',/driver output/]])assert(connectionIssues(s,cable(a,b)).some(t=>re.test(t)));
});
test('reserved pins and multiple RF feeds are flagged',()=>{const s=defaultState();assert(connectionIssues(s,cable('xiao:d1','thermal:sda')).some(t=>t.includes('onboard button')));assert(connectionIssues(s,cable('xiao:rf','rod:rf')).some(t=>t.includes('more than one')));});
test('removed components retain their cable plan without rendering active routes',()=>{const s=defaultState();assert.equal(activeConnections(s).length,7);s.instances=s.instances.filter(i=>i.id!=='thermal');assert.equal(activeConnections(s).length,3);assert.equal(s.connections.length,7);assert(connectionIssues(s,s.connections[0]).some(t=>t.includes('outside the assembly')));});
test('bench checked status never removes electrical mismatch warnings',()=>{const s=defaultState(),c=cable('xiao:3v3','xiao:gnd');c.status='Bench checked';assert(connectionIssues(s,c).some(t=>t.includes('short')));assert(!connectionIssues(s,c).some(t=>t.includes('not physically verified')));});
test('CSV includes contact-level records and correctly quotes notes',()=>{const s=defaultState();s.connections[0].note='Check "SDA", then measure';const csv=connectionCsv(s);assert(csv.includes('"Check ""SDA"", then measure"'));assert.equal(csv.split('\n').length,8);});
