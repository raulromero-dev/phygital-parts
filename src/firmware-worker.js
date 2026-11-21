import { createFirmwareRuntime } from './firmware-runtime.js';
let runtime;
self.onmessage=async ({data})=>{
 try{
  let frame;
  if(data.type==='init'){runtime=await createFirmwareRuntime(data.bundle);frame=data.session?runtime.restore(data.session):runtime.scene(0);}
  else if(!runtime)throw Error('Preview is not ready.');
  else if(data.type==='scene')frame=runtime.scene(data.index);
  else if(data.type==='tap')frame=runtime.tap(data.x,data.y);
  else if(data.type==='input')frame=runtime.input(data.input,data.value);
  else if(data.type==='step')frame=runtime.step(data.ms);
  else if(data.type==='frame')frame=runtime.frame();
  else throw Error('Unknown preview action.');
  self.postMessage({id:data.id,type:'frame',...frame},[frame.rgba.buffer]);
 }catch(error){self.postMessage({id:data.id,type:'error',error:error.message});}
};
