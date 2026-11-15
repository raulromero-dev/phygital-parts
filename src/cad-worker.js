// Classic worker: isolate expensive STEP triangulation from the interactive UI.
self.onmessage=async({data})=>{
 try{
  importScripts(data.jsUrl);
  const occt=await self.occtimportjs({locateFile:()=>data.wasmUrl});
  const result=occt.ReadStepFile(new Uint8Array(data.bytes),{linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:.002,angularDeflection:.3});
  if(!result.success||!result.meshes?.length||result.meshes.length>500||result.meshes.reduce((sum,m)=>sum+(m.attributes?.position?.array?.length||0),0)>3000000)throw Error('STEP model is too complex for the preview.');
  self.postMessage({meshes:result.meshes});
 }catch(error){self.postMessage({error:error.message});}
};
