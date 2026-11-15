import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import occtJs from 'occt-import-js/dist/occt-import-js.js?url';
import occtWasm from 'occt-import-js/dist/occt-import-js.wasm?url';
import { normalizeVisual } from './model-data.js';
const assets=new Map();
async function post(path,body,signal,key){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(key?{Authorization:'Bearer '+key}:{})},body:JSON.stringify(body),signal});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Model unavailable.');return data;
}
function step(bytes,signal){return new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./cad-worker.js',import.meta.url));
 const stop=()=>finish(Error('Model loading stopped.'));
 const timer=setTimeout(()=>finish(Error('STEP preview timed out.')),30000);
 function finish(error,data){clearTimeout(timer);signal?.removeEventListener('abort',stop);worker.terminate();error?reject(error):resolve(data);}
 if(signal?.aborted){finish(Error('Model loading stopped.'));return;}
 signal?.addEventListener('abort',stop,{once:true});
 worker.onmessage=event=>finish(event.data.error?Error(event.data.error):null,event.data.meshes);
 worker.onerror=()=>finish(Error('Could not read the STEP model.'));
 worker.postMessage({bytes,jsUrl:new URL(occtJs,location.href).href,wasmUrl:new URL(occtWasm,location.href).href},[bytes]);
});}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.15});}
export async function decodeCad(bytes,format,color,signal){
 let group=new THREE.Group();
 if(format==='glb'){
  const view=new DataView(bytes);if(bytes.byteLength<20||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength)throw Error('Invalid GLB.');
  const length=view.getUint32(12,true);if(length>bytes.byteLength-20)throw Error('Invalid GLB JSON.');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
  if([...(json.buffers||[]),...(json.images||[])].some(x=>x.uri)||json.extensionsRequired?.length||json.nodes?.length>5000||(json.accessors||[]).reduce((n,a)=>n+(a.count||0),0)>2000000)throw Error('CAD requires unsupported external resources.');
  group=(await new GLTFLoader().parseAsync(bytes,'')).scene;
 }else if(format==='stl'){
  const geometry=new STLLoader().parse(bytes);if(geometry.attributes.position.count>1000000)throw Error('CAD is too complex.');group.add(new THREE.Mesh(geometry,material(color)));
 }else if(format==='step'){
  for(const m of await step(bytes,signal)){
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(m.attributes.position.array,3));geometry.setIndex(m.index.array);
   if(m.attributes.normal)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(m.attributes.normal.array,3));else geometry.computeVertexNormals();
   group.add(new THREE.Mesh(geometry,material(m.color?new THREE.Color(...m.color):color)));
  }
 }else throw Error('Unsupported CAD format.');
 const box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());
 if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0))throw Error('CAD has no usable volume.');
 return group;
}
function fitModel(group,dimensions,align=false){
 const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3());
 group.position.sub(center);const outer=new THREE.Group();outer.add(group);
 // CAD exporters disagree on which axis is thickness. Choose an axis alignment
 // that best matches the researched envelope, then preserve all proportions.
 const rotations=align?[[0,0,0],[Math.PI/2,0,0],[0,0,Math.PI/2],[0,Math.PI/2,0],[Math.PI/2,Math.PI/2,0],[0,Math.PI/2,Math.PI/2]]:[[0,0,0]];
 let best;
 for(const rotation of rotations){outer.rotation.set(...rotation);outer.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(outer).getSize(new THREE.Vector3()).toArray(),ratios=dimensions.map((d,i)=>d/size[i]),score=Math.max(...ratios)/Math.min(...ratios);if(!best||score<best.score)best={rotation,scale:Math.min(...ratios),score};}
 outer.rotation.set(...best.rotation);outer.scale.setScalar(best.scale);return outer;
}
export async function loadCad(visual,dimensions,color,signal){
 if(!assets.has(visual.hash)){
  const response=await post('/api/assets',{url:visual.url,format:visual.format},signal);
  if(response.hash!==visual.hash)throw Error('The source CAD changed; research this part again.');
  const bytes=Uint8Array.from(atob(response.data),c=>c.charCodeAt(0)).buffer;
  assets.set(visual.hash,await decodeCad(bytes,visual.format,color,signal));
 }
 return fitModel(assets.get(visual.hash).clone(true),dimensions,true);
}
export function buildImageModel(part){
 const group=new THREE.Group();
 for(const s of part.visual.recipe.shapes){
  const dimensions=s.size.map((n,i)=>n*part.dimensions[i]);
  let geometry=s.type==='cylinder'?new THREE.CylinderGeometry(.5,.5,1,32):s.type==='sphere'?new THREE.SphereGeometry(.5,24,16):new THREE.BoxGeometry(1,1,1);
  geometry.scale(...dimensions);const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:s.color,metalness:s.metalness,roughness:s.roughness}));
  mesh.position.set(...s.position.map((n,i)=>n*part.dimensions[i]));mesh.rotation.set(...s.rotation.map(n=>n*Math.PI/180));group.add(mesh);
 }
 return fitModel(group,part.dimensions);
}
export async function preparePartModel(part,key,image,signal,onStatus=()=>{}){
 const source=part.model;let cadFailure='';
 if(source?.cadUrl){
  try{
   onStatus('Loading source CAD');const data=await post('/api/assets',{url:source.cadUrl,format:source.cadFormat},signal);
   const visual=normalizeVisual({type:'cad',url:source.cadUrl,sourceUrl:source.cadSourceUrl,format:source.cadFormat,hash:data.hash});
   const bytes=Uint8Array.from(atob(data.data),c=>c.charCodeAt(0)).buffer;
   assets.set(data.hash,await decodeCad(bytes,visual.format,part.color,signal));
   return {visual,modelNote:'Source CAD from '+source.cadSourceUrl+'. Exact revision, orientation and dimensions still need review. Preview uses automatic axis alignment and uniform envelope scaling.'};
  }catch(error){if(signal.aborted)throw error;cadFailure=error.message;}
 }
 if(source?.imageUrl||image){
  try{
   onStatus('Reconstructing from image');const result=await post('/api/model',{part:{name:part.name,dimensions:part.dimensions,kind:part.kind,model:source},image:source?.imageUrl?undefined:image},signal,key);
   const visual=normalizeVisual(result.visual);if(!visual)throw Error('Invalid image model.');
   return {visual,modelNote:'Image-derived approximation · '+visual.recipe.notes+(cadFailure?' Source CAD could not load: '+cadFailure:'')};
  }catch(error){if(signal.aborted)throw error;return {modelNote:'Planning envelope. Image reconstruction unavailable: '+error.message+(cadFailure?' CAD: '+cadFailure:'')};}
 }
 return {modelNote:'Planning envelope. '+(cadFailure?'Source CAD could not load: '+cadFailure:'No usable CAD or reference image was found.')};
}
