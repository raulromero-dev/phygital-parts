import {validateState} from './engine.js';
import {connectionCsv} from './connections.js';
import {validateFirmwareBundle,validateFirmwareState,firmwareBytes} from './firmware-data.js';
import {storedZip} from './download-zip.js';

export function simulationFiles({bundle,state,binding,source,frame}){
 const preview=validateFirmwareBundle({...bundle,session:binding.session});
 const project=validateState({...state,firmware:validateFirmwareState(binding,state.instances.map(i=>i.id))});
 const files=[['preview.json',JSON.stringify(preview,null,2)],['renderer.wasm',firmwareBytes(preview.wasm)],['project.json',JSON.stringify(project,null,2)],['connections.csv',connectionCsv(project)]];
 let hasSource=false;
 if(source&&source.format==='phygital-renderer-source'&&source.sha256===preview.sha256&&source.revision===preview.revision){
  if(!Array.isArray(source.files)||source.files.length>100)throw Error('Renderer source package is invalid.');
  for(const file of source.files){if(!file||typeof file.path!=='string'||typeof file.text!=='string')throw Error('Renderer source package is invalid.');files.push(['source/'+file.path,file.text]);}
  hasSource=true;
 }
 if(frame)files.push(['screen.png',frame]);
 files.push(['README.md',`# Simulation download\n\n${preview.name}\n\n## Reopen in Phygital Studio\n\nOpen a project at https://phygitalstudio.app, choose Simulate, then Use your own firmware → Import preview and select preview.json. It restores the selected test scene, test inputs and pause setting. Source links and compiled-code checksums are retained.\n\nTo restore the assembly and wiring too, use My projects → Import project and choose project.json. This creates a separate copy, including all saved layouts and the current simulation settings. The project file contains your project notes; review them before sharing. Chat, uploaded photos and API keys are excluded.\n\n## Files\n\n- preview.json: portable compiled screen renderer and test settings.\n- renderer.wasm: the same compiled renderer, not a device-flashable binary.\n- project.json: assembly, layouts, wiring and preview settings.\n- connections.csv: the active layout's cable map.\n${frame?'- screen.png: the captured screen at download time.\n':''}${hasSource?'- source/: pinned renderer C/C++ source, adapter, build script, examples, provenance and included dependency license.\n':'- Original C/C++ source was not supplied with this imported renderer. Follow its source link or ask its author for the matching source.\n'}\n## Edit the screen UI\n\n${hasSource?'Edit source/firmware-preview/vendor/phygital/tft_ui.h (and tft_fonts.h as needed). Activate an Emscripten SDK, then run `python3 source/scripts/build-firmware-preview.py`. Reimport source/public/firmware/phygital-tft.json into Studio. No compilation service or API key is required. See source/docs/FIRMWARE_PREVIEWS.md for other displays. Preserve attribution and update source hashes/revision when maintaining a fork.':'Source: '+(preview.sourceUrl||'not provided')+'\nRevision: '+(preview.revision||'not provided')+'\nA compiled WASM preview cannot be converted back into the original editable firmware.'}\n\n## Scope\n\nSettings restart the named scene with the saved sensor controls. Touch-navigation history and elapsed animation time are not a VM snapshot; screen.png records the exact captured appearance. These files preview the screen renderer with synthetic data, not the full MCU, radios, buses or electrical behavior. They are not a complete ESP32 firmware/flash package.\n`]);
 return files;
}
export function downloadSimulation(options){return storedZip(simulationFiles(options));}
