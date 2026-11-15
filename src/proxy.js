import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// Unknown products receive dimensioned envelopes, never invented manufacturer CAD.
export function buildProxy(part){
 const [w,h,d]=part.dimensions,group=new THREE.Group();
 const material=new THREE.MeshStandardMaterial({color:part.color||'#355d78',roughness:.55});
 const body=part.kind==='motor'?new THREE.CylinderGeometry(w/2,w/2,h,48):new RoundedBoxGeometry(w,h,d,3,Math.min(.7,w/12,h/5,d/12));
 group.add(new THREE.Mesh(body,material));
 if(part.kind==='screen'){
  const glass=new THREE.Mesh(new THREE.BoxGeometry(w*.9,.08,d*.88),new THREE.MeshStandardMaterial({color:'#101820',roughness:.22}));glass.position.y=h/2+.04;group.add(glass);
 }
 // Pins are only represented when the user or a sourced proposal supplied them.
 for(const port of part.ports||[]){
  const pin=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),new THREE.MeshStandardMaterial({color:'#b69b56',metalness:.7,roughness:.35}));
  pin.position.set(...(port.anchor||[0,0,0]).map((n,i)=>n*part.dimensions[i]/2));group.add(pin);
 }
 return group;
}
