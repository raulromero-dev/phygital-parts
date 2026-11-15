import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export function materials(){return {
 pcb:new THREE.MeshStandardMaterial({color:'#0b2f49',roughness:.48,metalness:.1}),
 edge:new THREE.MeshStandardMaterial({color:'#796f50',roughness:.7}),
 gold:new THREE.MeshStandardMaterial({color:'#c4a25c',metalness:.92,roughness:.27}),
 solder:new THREE.MeshStandardMaterial({color:'#bcc1c9',metalness:.95,roughness:.28}),
 chip:new THREE.MeshStandardMaterial({color:'#181d24',roughness:.72}),
 socket:new THREE.MeshStandardMaterial({color:'#090d13',roughness:.45}),
 housing:new THREE.MeshStandardMaterial({color:'#eeeae1',roughness:.28}),
};}
function box(group,size,position,material,radius=.025){const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,3,Math.min(radius,...size.map(n=>n/3))),material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
function tube(group,points,material,radius=.014){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,radius,8,false),material);mesh.castShadow=true;group.add(mesh);return mesh;}
function print(group,text,size,position,color='#d8e1e3'){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='500 54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));plane.position.set(...position);group.add(plane);
}
export function cableModel(m){
 // Compact keyed wire-to-board plug: four recessed crimp terminals, a small
 // retaining latch and thin insulated leads, rather than exposed male blades.
 const group=new THREE.Group();
 box(group,[.49,.60,.28],[-.025,0,0],m.housing,.022);
 box(group,[.12,.60,.035],[.265,0,-.122],m.housing,.008);
 box(group,[.12,.60,.035],[.265,0,.122],m.housing,.008);
 for(const y of [-.283,.283])box(group,[.12,.035,.25],[.265,y,0],m.housing,.006);
 for(const y of [-.13,0,.13])box(group,[.12,.024,.25],[.265,y,0],m.housing,.005);
 box(group,[.22,.31,.035],[-.04,0,.155],m.housing,.01);
 box(group,[.055,.31,.035],[.06,0,.18],m.housing,.006);
 for(const y of [-.27,.27])box(group,[.35,.025,.025],[-.03,y,.145],m.housing,.005);
 for(let i=0;i<4;i++){
  const y=(i-1.5)*.13;
  box(group,[.012,.098,.17],[.226,y,0],m.socket,.004);
  box(group,[.045,.055,.012],[.249,y,-.057],m.solder,.003);
  box(group,[.055,.075,.008],[-.18,y,.143],m.socket,.003);
  box(group,[.026,.045,.009],[-.178,y,.149],m.solder,.002);
  const wire=new THREE.MeshStandardMaterial({color:['#242832','#c3a14f','#e8e2d5','#af4b3f'][i],roughness:.38});
  tube(group,[[-1.65,.38+y,.01],[-1.20,-.13+y,.025],[-.65,-.14+y,.01],[-.27,y,0]],wire,.026);
 }
 return group;
}
export function chipModel(m){
 const group=new THREE.Group();box(group,[2.5,2.4,.14],[0,0,0],m.edge,.12);box(group,[2.5,2.4,.065],[0,0,.095],m.pcb,.11);box(group,[1.04,1.04,.16],[0,0,.25],m.chip,.06);box(group,[.95,.95,.025],[0,0,.34],m.chip,.03);
 for(let side=0;side<4;side++){
  const contacts=new THREE.Group();contacts.rotation.z=side*Math.PI/2;
  for(let i=0;i<5;i++){const y=(i-2)*.19;box(contacts,[.33,.09,.055],[.63,y,.18],m.gold,.018);box(contacts,[.055,.09,.12],[.5,y,.23],m.gold,.012);tube(contacts,[[.79,y,.14],[.88,y,.14],[1.01,y+.1,.14],[1.12,y+.1,.14]],m.gold,.009);}
  group.add(contacts);
 }
 for(const x of [-.99,.99])for(const y of [-.93,.93]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,24),m.gold);ring.position.set(x,y,.15);group.add(ring);const hole=new THREE.Mesh(new THREE.CircleGeometry(.056,24),m.socket);hole.position.set(x,y,.14);group.add(hole);}
 for(let i=0;i<3;i++){box(group,[.12,.06,.07],[.66+i*.17,-.74,.17],m.solder,.01);box(group,[.1,.055,.07],[.66+i*.17,-.74,.18],m.chip,.008);}
 print(group,'phy',[.72,.2],[0,.08,.36]);print(group,'04',[.26,.1],[0,-.19,.36]);print(group,'phygital',[1.05,.14],[0,-.99,.15]);
 // Matching right-angle PCB header: open shroud, four contacts and solder feet.
 box(group,[.30,.69,.04],[-1.27,0,.17],m.housing,.008);
 box(group,[.30,.69,.04],[-1.27,0,.47],m.housing,.008);
 for(const y of [-.325,.325])box(group,[.30,.04,.28],[-1.27,y,.32],m.housing,.008);
 box(group,[.035,.65,.28],[-1.105,0,.32],m.housing,.006);
 for(let i=0;i<4;i++){const y=(i-1.5)*.13;box(group,[.19,.027,.027],[-1.22,y,.32],m.solder,.004);box(group,[.13,.045,.025],[-1.01,y,.15],m.solder,.004);}
 return group;
}
export function gateModel(m,length){
 const group=new THREE.Group();box(group,[.52,length,.38],[0,length/2,0],m.chip,.045);box(group,[.68,.24,.5],[0,.12,0],m.socket,.035);
 const count=Math.ceil(length/.3);for(let i=0;i<count;i++){const y=.38+i*.3;if(y>length-.1)break;for(const x of [-.34,.34])box(group,[.21,.09,.06],[x,y,.05],m.gold,.014);box(group,[.18,.17,.018],[0,y,.205],m.socket,.025);box(group,[.07,.07,.02],[0,y,.22],m.gold,.01);}
 return group;
}

// Merge by material: hundreds of connector details become a handful of draws.
export async function batchModel(root){
 const {mergeGeometries}=await import('three/addons/utils/BufferGeometryUtils.js');root.updateMatrixWorld(true);
 const batches=new Map(),originals=new Set();root.traverse(mesh=>{if(!mesh.isMesh)return;let geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);if(geometry.index){const flat=geometry.toNonIndexed();geometry.dispose();geometry=flat;}if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geometry);originals.add(mesh.geometry);});
 const result=new THREE.Group();for(const [material,geometries]of batches){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)continue;const mesh=new THREE.Mesh(merged,material);mesh.castShadow=!material.map;mesh.receiveShadow=true;result.add(mesh);}originals.forEach(g=>g.dispose());return result;
}
