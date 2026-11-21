// Explicit source allowlist; never bundle environment files, keys or local projects.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const files=[];
function add(relative){const text=fs.readFileSync(path.join(root,relative),'utf8');files.push({path:relative,text,sha256:crypto.createHash('sha256').update(text).digest('hex')});}
function walk(relative){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=relative+'/'+entry.name;if(entry.isDirectory())walk(name);else if(entry.isFile()&&/\.(cpp|c|h|json|txt)$/.test(name))add(name);}}
walk('firmware-preview');
for(const file of ['scripts/build-firmware-preview.py','scripts/package-firmware-preview.mjs','src/firmware-data.js','docs/FIRMWARE_PREVIEWS.md'])add(file);
const bundle=JSON.parse(fs.readFileSync(path.join(root,'public/firmware/phygital-tft.json')));
fs.writeFileSync(path.join(root,'public/firmware/phygital-tft-source.json'),JSON.stringify({format:'phygital-renderer-source',version:1,revision:bundle.revision,sha256:bundle.sha256,files})+'\n');
console.log('Packaged renderer source:',files.length,'files');
