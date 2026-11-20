// Pack any locally compiled framebuffer adapter; no source is executed here.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateFirmwareBundle} from '../src/firmware-data.js';
const [wasmFile,manifestFile,outputFile]=process.argv.slice(2);
if(!wasmFile||!manifestFile||!outputFile)throw Error('Usage: node scripts/package-firmware-preview.mjs renderer.wasm manifest.json preview.json');
const bytes=fs.readFileSync(wasmFile),manifest=JSON.parse(fs.readFileSync(manifestFile));
const bundle=validateFirmwareBundle({...manifest,format:'phygital-firmware',version:1,pixelFormat:'rgb565',wasm:bytes.toString('base64'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
fs.writeFileSync(outputFile,JSON.stringify(bundle)+'\n');
console.log('Packaged',bundle.name,`${bundle.width} × ${bundle.height}`,`${bundle.scenes.length} scenes`);
