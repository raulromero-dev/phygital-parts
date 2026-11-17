import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Generic 2.54 mm single-contact housings, not CAD for a specific cable maker.
export const JUMPER_EXIT=10.2;
export function jumperCurve(female,male,femaleNormal,maleNormal){
 const start=female.clone().addScaledVector(femaleNormal,JUMPER_EXIT);
 const end=male.clone().addScaledVector(maleNormal,JUMPER_EXIT);
 const lead=Math.min(3,start.distanceTo(end)/5);
 // Leave the rear header downwards; approach the carrier from above.
 // These service bends follow part rotation, rather than arching through its PCB.
 return new THREE.CatmullRomCurve3([start,start.clone().addScaledVector(femaleNormal,lead),start.clone().lerp(end,.5),end.clone().addScaledVector(maleNormal,lead),end]);
}
export function jumperConnector(position,normal,gender,connectionId,opacity=1){
 const group=new THREE.Group();group.position.copy(position);
 group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
 const plastic=new THREE.MeshStandardMaterial({color:'#17191b',roughness:.48,transparent:opacity<1,opacity});
 const metal=new THREE.MeshStandardMaterial({color:'#c0a05a',metalness:.85,roughness:.28,transparent:opacity<1,opacity});
 const add=(size,at,material,round=false)=>{
  const mesh=new THREE.Mesh(round?new RoundedBoxGeometry(...size,2,.09):new THREE.BoxGeometry(...size),material);
  mesh.position.set(...at);mesh.userData.connectionId=connectionId;mesh.castShadow=true;group.add(mesh);
 };
 if(gender==='female'){
  // Open mouth accepts the screen's existing square male pin.
  add([2.4,6.7,2.4],[0,5.25,0],plastic,true);
  for(const s of [-1,1]){add([.45,2.2,2.4],[s*.975,.8,0],plastic);add([1.5,2.2,.45],[0,.8,s*.975],plastic);}
  add([.7,1.9,.15],[0,4.1,1.22],metal); // visible terminal retaining window
 }else{
  add([.64,6.5,.64],[0,-1.25,0],metal);
  add([2.4,6.7,2.4],[0,5.25,0],plastic,true);
  add([.7,1.7,.15],[0,4.1,1.22],metal);
 }
 add([1.45,1.6,1.45],[0,9.3,0],plastic,true);
 return group;
}
