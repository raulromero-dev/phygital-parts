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

// In a stack, return around the LCD's rear edge before approaching the carrier
// from above. The path is illustrative, not a bend-radius or collision solver.
// Working in screen-local space also preserves this route when boards rotate.
export function haldzemoJumperCurve(female,male,screenMatrix,maleNormal,carrierMatrix){
 const femaleNormal=new THREE.Vector3(0,-1,0).transformDirection(screenMatrix);
 const inverse=screenMatrix.clone().invert();
 const start=female.clone().addScaledVector(femaleNormal,JUMPER_EXIT).applyMatrix4(inverse);
 const end=male.clone().addScaledVector(maleNormal,JUMPER_EXIT).applyMatrix4(inverse);
 const normal=maleNormal.clone().transformDirection(inverse);
 if(normal.y<.99||end.y>=-3||Math.abs(end.x)>35||Math.abs(end.z)>43)
  return jumperCurve(female,male,femaleNormal,maleNormal);
 if(carrierMatrix){
  const carrier=new THREE.Box3(new THREE.Vector3(-21,-5,-29),new THREE.Vector3(21,5,29))
   .applyMatrix4(inverse.clone().multiply(carrierMatrix));
  const gap=start.z-1.2-carrier.max.z;
  if(gap>=4&&gap<=15&&end.y>-8){
   // Leave the housing downwards, then turn up in the clear corridor between
   // its front face and the carrier's rear edge. Fan out before the seated XIAO.
   const turn=carrier.max.z+gap/2,high=carrier.max.y+2;
   const points=[start,new THREE.Vector3(start.x,start.y-1.25,start.z-1.5),
    new THREE.Vector3(start.x,start.y-1.25,turn),new THREE.Vector3(start.x,high,turn),
    new THREE.Vector3(end.x,high,carrier.max.z-18),
    new THREE.Vector3(end.x,high,end.z+5),new THREE.Vector3(end.x,end.y+.8,end.z+2),end];
   return new THREE.CatmullRomCurve3(points.map(p=>p.applyMatrix4(screenMatrix)),false,'catmullrom',.12);
  }
 }
 // Keep the return below the rear packages (lowest modeled surface: -1.75),
 // while leaving the male housing from above even in a close stack.
 const low=start.y-1.25,high=Math.min(-2.8,Math.max(end.y+3,start.y+3)),rear=48.5;
 const side=start.x<0?-20.5:20.5;
 const points=[start,new THREE.Vector3(start.x,low,start.z+1.5),
  new THREE.Vector3(start.x,low,rear),new THREE.Vector3(start.x,high,rear),
  new THREE.Vector3(side,high,rear),new THREE.Vector3(side,high,36.5),
  new THREE.Vector3(end.x,high,end.z),end];
 return new THREE.CatmullRomCurve3(points.map(p=>p.applyMatrix4(screenMatrix)),false,'catmullrom',.15);
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
