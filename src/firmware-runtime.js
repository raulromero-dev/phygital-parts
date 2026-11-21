import { validateFirmwareBundle, validateFirmwareSession, firmwareBytes } from './firmware-data.js';
// Called only in a disposable worker in the app. No network, filesystem, clock,
// environment or JS callbacks are supplied to the imported firmware.
export async function createFirmwareRuntime(value){
 const bundle=validateFirmwareBundle(value),bytes=firmwareBytes(bundle.wasm);
 if(bundle.sha256&&globalThis.crypto?.subtle){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==bundle.sha256)throw Error('Preview checksum does not match.');}
 const module=await WebAssembly.compile(bytes);
 const imports=WebAssembly.Module.imports(module);
 if(imports.some(i=>i.kind!=='function'||i.module!=='wasi_snapshot_preview1'||!['fd_write','fd_close','fd_seek','proc_exit'].includes(i.name)))throw Error('This preview requests unsupported host capabilities.');
 let memory;
 const instance=await WebAssembly.instantiate(module,{wasi_snapshot_preview1:{fd_write:(_fd,iovs,count,out)=>{if(!memory)return 8;const dv=new DataView(memory.buffer);let total=0;if(count<0||count>1024)return 8;for(let i=0;i<count;i++)total+=dv.getUint32(iovs+i*8+4,true);dv.setUint32(out,total,true);return 0;},fd_close:()=>8,fd_seek:()=>8,proc_exit:()=>{throw Error('Preview exited.');}}});
 const api=instance.exports;memory=api.memory;
 for(const name of ['sim_init','sim_width','sim_height','sim_frame','sim_scene','sim_step','sim_tap'])if(typeof api[name]!=='function')throw Error('Missing preview export: '+name);
 api._initialize?.();api.sim_init();
 const width=api.sim_width(),height=api.sim_height();
 if(width!==bundle.width||height!==bundle.height)throw Error('Preview resolution does not match its manifest.');
 function frame(){const pointer=api.sim_frame();if(!Number.isInteger(pointer)||pointer<0||pointer%2||pointer+width*height*2>memory.buffer.byteLength)throw Error('Invalid framebuffer.');const raw=new Uint16Array(memory.buffer,pointer,width*height),rgba=new Uint8ClampedArray(width*height*4);for(let i=0;i<raw.length;i++){const c=raw[i],n=i*4;rgba[n]=(c>>11)*255/31;rgba[n+1]=((c>>5)&63)*255/63;rgba[n+2]=(c&31)*255/31;rgba[n+3]=255;}const inputs=typeof api.sim_get_input==='function'?bundle.inputs.map(i=>({id:i.id,value:api.sim_get_input(i.id)})).filter(i=>Number.isFinite(i.value)):[];return {width,height,rgba,inputs};}
 const runtime={frame,scene(index){if(!Number.isInteger(index)||index<0||index>=bundle.scenes.length)throw Error('Unknown test scene.');api.sim_scene(index);return frame();},step(ms){api.sim_step(Math.max(0,Math.min(1000,ms)));return frame();},tap(x,y){api.sim_tap(Math.floor(x),Math.floor(y));return frame();},input(id,value){const input=bundle.inputs.find(i=>i.id===id);if(!input||!Number.isFinite(value)||value<input.min||value>input.max||typeof api.sim_input!=='function')throw Error('Unsupported simulated input.');api.sim_input(id,value);return frame();},restore(value){const session=validateFirmwareSession(value,bundle);runtime.scene(session.scene);for(const input of session.inputs)runtime.input(input.id,input.value);return frame();}};
 return runtime;
}
