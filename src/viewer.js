import { buildProxy } from './proxy.js';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { activeConnections, endpoint, portsFor, harnessFor } from './connections.js';
import { partFor, radians } from './engine.js';
export class AssemblyViewer {
  constructor(host,{onSelect,onMove,onDragStart,onDragEnd,onError,onConnection,onPort}){
    this.host=host;this.callbacks={onSelect,onMove,onDragStart,onDragEnd,onError,onConnection,onPort};this.groups=new Map();this.cache=new Map();this.labels=new Map();this.explode=0;this.showLabels=false;this.showWires=true;this.mode='inspect';
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#fafafa');this.scene.fog=new THREE.Fog('#fafafa',650,1300);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;host.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D assembly. Drag to orbit, scroll to zoom; select parts from the component list for keyboard editing.');this.renderer.domElement.setAttribute('role','img');
    this.camera=new THREE.OrthographicCamera(-130,130,130,-130,.1,2000);this.camera.position.set(150,190,200);this.camera.zoom=1.25;
    this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.target.set(0,10,0);this.orbit.enableDamping=true;this.orbit.minZoom=.35;this.orbit.maxZoom=6;
    // Studio reflections reveal metal contacts and fine CAD edges without adding UI color.
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();
    this.scene.environment=pmrem.fromScene(room,.04).texture;this.scene.environmentIntensity=.6;room.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x808080,1.6));
    const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(-100,250,120);key.castShadow=true;key.shadow.mapSize.set(4096,4096);Object.assign(key.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:600});key.shadow.bias=-.001;key.shadow.normalBias=.6;this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(150,80,-100);this.scene.add(fill);
    // Rear sockets need their own fill when inspecting the underside of a board.
    const rearFill=new THREE.DirectionalLight(0xffffff,1.8);rearFill.position.set(80,-220,120);this.scene.add(rearFill);
    const floor=this.floor=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.MeshStandardMaterial({color:'#fafafa',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-2.4;floor.receiveShadow=true;this.scene.add(floor);
    const grid=this.grid=new THREE.GridHelper(600,60,0xd4d4d4,0xe5e5e5);grid.position.y=-2.3;grid.material.transparent=true;grid.material.opacity=.5;this.scene.add(grid);
    this.leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');this.leaders.classList.add('label-leaders');this.host.append(this.leaders);
    this.assembly=new THREE.Group();this.scene.add(this.assembly);this.enclosure=new THREE.Group();this.scene.add(this.enclosure);this.wires=new THREE.Group();this.scene.add(this.wires);this.portMarkers=new THREE.Group();this.scene.add(this.portMarkers);
    this.hover=document.createElement('div');this.hover.className='connection-hover';this.hover.hidden=true;host.append(this.hover);
    this.transform=new TransformControls(this.camera,this.renderer.domElement);this.transform.setSize(.75);this.transform.setTranslationSnap(1);this.transform.setRotationSnap(Math.PI/12);this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('mouseDown',()=>onDragStart());
    this.transform.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value;this.dragging=e.value;});
    this.transform.addEventListener('objectChange',()=>{
      const g=this.transform.object;if(!g||!this.dragging)return;
      onMove(g.userData.partId,g.position.toArray(),[g.rotation.x,g.rotation.y,g.rotation.z].map(v=>v*180/Math.PI));
    });
    this.transform.addEventListener('mouseUp',()=>onDragEnd());
    this.selection=new THREE.Box3Helper(new THREE.Box3(),0x171717);this.selection.visible=false;this.scene.add(this.selection);
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let start=[0,0];
    this.renderer.domElement.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});
    const pick=e=>{
      const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,this.camera);
      const targets=[...this.assembly.children,...this.wires.children,...(this.mode==='connect'?this.portMarkers.children:[])];
      const pins=this.mode==='connect'?ray.intersectObjects(this.portMarkers.children,true):[];return pins[0]?.object||ray.intersectObjects(targets,true)[0]?.object;
    };
    this.renderer.domElement.addEventListener('pointermove',e=>{
      if(this.dragging)return;const o=pick(e);let label='';
      if(o?.userData.portRef){const p=endpoint(this.state,o.userData.portRef);label=p.label+' · click to connect';}
      else if(o?.userData.connectionId){const h=harnessFor(this.state,o.userData.connectionId);label=(h?.name||'Cable')+' · click for pin mapping';}
      this.hover.hidden=!label;this.hover.textContent=label;this.hover.style.left=Math.min(e.offsetX+16,this.host.clientWidth-260)+'px';this.hover.style.top=(e.offsetY+16)+'px';this.renderer.domElement.style.cursor=label?'pointer':'';
    });
    this.renderer.domElement.addEventListener('pointerleave',()=>this.hover.hidden=true);
    this.renderer.domElement.addEventListener('pointerup',e=>{
      if(this.dragging||this.transform.axis||Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)return;
      let o=pick(e);if(!o)return;
      if(o.userData.portRef){onPort(o.userData.portRef);return;}
      if(o.userData.connectionId){onConnection(o.userData.connectionId);return;}
      while(o&&!o.userData.partId)o=o.parent;if(o)onSelect(o.userData.partId);
    });
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();this.frame();
  }
  setTheme(theme){
    this.theme=theme;const dark=theme==='dark',background=dark?'#0a0a0a':'#fafafa';
    this.scene.background.set(background);this.scene.fog.color.set(background);
    this.floor.material.color.set(background);this.grid.material.opacity=dark?.18:.5;
    this.selection.material.color.set(dark?'#ededed':'#171717');
    // Rebuild only view helpers; theme changes never recolor source CAD or exports.
    this.makeWires();this.makePorts();
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const span=100;this.camera.left=-span*w/h;this.camera.right=span*w/h;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();}
  async load(part){
    if(this.cache.has(part.id))return this.cache.get(part.id);
    const promise=(async()=>{
      if((part.id.startsWith('custom-')&&!part.modelId)||part.id==='motor-rail')return buildProxy(part);
      try{const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/${part.modelId||part.id}.glb?detail=4`);const group=gltf.scene;
      // Photo-based preview materials; keep the supplied GLBs untouched.
      group.traverse(object=>{
        if(!object.isMesh)return;
        const referenceMaterial=material=>{
          // Grove soldermask is a deeper blue in the product photos.
          // Compensate for the bright studio lights without dimming other parts.
          if(/^Blue(?:\.\d+)?$/.test(material.name)){
            const pcb=material.clone();pcb.color.set('#124567');pcb.roughness=.55;return pcb;
          }
          // The Waveshare CAD uses mid-gray for its unpowered glass and bezel.
          if((part.modelId||part.id)==='lcd-27579'&&material.name==='CAD 0.149,0.149,0.149'){
            const glass=material.clone();glass.color.set('#14191e');glass.roughness=.24;return glass;
          }
          return material;
        };
        object.material=Array.isArray(object.material)?object.material.map(referenceMaterial):referenceMaterial(object.material);
      });
      const box=new THREE.Box3().setFromObject(group);const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());group.position.sub(center);const normalized=new THREE.Group();normalized.add(group);const ratios=part.dimensions.map((d,i)=>d/[size.x,size.y,size.z][i]);if(['xiao','oled-938','lcd-27579','crowpanel-advance-28','cardputer-adv'].includes(part.modelId||part.id)||part.modelId==='mosfet-5648')normalized.scale.setScalar(Math.min(...ratios));else normalized.scale.set(...ratios);return normalized;}
      catch(error){this.callbacks.onError(`Could not load ${part.short}; showing a dimension box.`);return new THREE.Mesh(new THREE.BoxGeometry(...part.dimensions),new THREE.MeshStandardMaterial({color:part.color}));}
    })();this.cache.set(part.id,promise);return promise;
  }
  async sync(state,selected){
    this.state=state;this.selected=selected;const generation=(this.generation||0)+1;this.generation=generation;
    const ids=new Set(state.instances.map(i=>i.id));for(const [id,g]of this.groups)if(!ids.has(id)){this.assembly.remove(g);this.groups.delete(id);this.labels.get(id)?.remove();this.labels.delete(id);this.leaders.querySelector(`[data-part="${id}"]`)?.remove();}
    await Promise.all(state.instances.map(async i=>{
      if(this.groups.has(i.id))return;
      const part=partFor(state,i.id),asset=await this.load(part);if(generation!==this.generation)return;
      const g=new THREE.Group();g.userData.partId=i.id;g.add(asset.clone(true));g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.groups.set(i.id,g);this.assembly.add(g);
      const label=document.createElement('button');label.className='part-label';label.textContent=part.short;label.onclick=()=>this.callbacks.onSelect(i.id);label.setAttribute('aria-label',`Select ${part.name} in model`);this.host.append(label);this.labels.set(i.id,label);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.dataset.part=i.id;this.leaders.append(line);
    }));
    if(generation!==this.generation)return;this.updatePlacement();this.makeEnclosure();this.setSelected(selected);this.makeWires();
  }
  updatePlacement(){
    if(!this.state)return;
    this.state.instances.forEach((i,index)=>{const g=this.groups.get(i.id);if(!g)return;g.position.fromArray(i.position);g.position.y+=this.explode*(index*14);g.rotation.set(...radians(i.rotation));const p=partFor(this.state,i.id);g.scale.set(...i.dimensions.map((n,a)=>n/p.dimensions[a]));});
  }
  disposeGroup(g){for(const child of [...g.children]){child.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});g.remove(child);}}
  makeEnclosure(){
    this.disposeGroup(this.enclosure);if(!this.state.enclosureVisible)return;
    const [w,h,d]=this.state.enclosure;
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),new THREE.LineDashedMaterial({color:0xa3a3a3,dashSize:2,gapSize:1.5,transparent:true,opacity:.5}));edges.computeLineDistances();edges.position.y=h/2;this.enclosure.add(edges);
    const tray=new THREE.Mesh(new RoundedBoxGeometry(w+3,2,d+3,4,1),new THREE.MeshStandardMaterial({color:'#d4d4d4',roughness:.7,transparent:true,opacity:.4,depthWrite:false}));tray.position.y=-1;tray.receiveShadow=true;this.enclosure.add(tray);
  }
  anchor(ref){
    const e=endpoint(this.state,ref),g=e&&this.groups.get(e.part);if(!g)return null;
    const p=partFor(this.state,e.part);g.updateMatrixWorld(true);return new THREE.Vector3(...e.anchor.map((v,i)=>v*p.dimensions[i]/2)).applyMatrix4(g.matrixWorld);
  }
  makePorts(){
    this.disposeGroup(this.portMarkers);if(this.mode!=='connect'||!this.selected||!this.state)return;
    for(const p of portsFor(this.state,this.selected)){
      const ref=this.selected+':'+p.id,at=this.anchor(ref);if(!at)continue;
      const dot=new THREE.Mesh(new THREE.SphereGeometry(.8,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',depthTest:false}));dot.position.copy(at);dot.renderOrder=20;dot.userData.portRef=ref;this.portMarkers.add(dot);
      const rim=new THREE.Mesh(new THREE.SphereGeometry(1.04,16,12),new THREE.MeshBasicMaterial({color:'#171717',depthTest:false,side:THREE.BackSide}));rim.position.copy(at);rim.renderOrder=19;rim.userData.portRef=ref;this.portMarkers.add(rim);
    }
  }
  highlightCable(id){this.highlighted=id?new Set(harnessFor(this.state,id)?.connections.map(c=>c.id)||[id]):new Set();this.makeWires();}
  makeWires(){
    this.disposeGroup(this.wires);if(!this.showWires||!this.state)return;
    this.assembly.updateMatrixWorld(true);
    for(const c of activeConnections(this.state)){
      const a=endpoint(this.state,c.from),b=endpoint(this.state,c.to);if(!a||!b)continue;
      const ga=this.groups.get(a.part),gb=this.groups.get(b.part);if(!ga||!gb)continue;
      const from=this.anchor(c.from),to=this.anchor(c.to),mid=from.clone().lerp(to,.5);mid.y+=8;
      const index=harnessFor(this.state,c.id)?.connections.findIndex(w=>w.id===c.id)||0;mid.y+=index*.7;
      // Mated headers are contacts, not looping jumper cables (also in exploded view).
      if(c.type==='Board-to-board headers')mid.copy(from).lerp(to,.5);
      // Round, smooth cable geometry is illustrative: length and gauge remain user records.
      const curve=new THREE.CatmullRomCurve3([from,mid,to]);
      const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,64,/coax/i.test(c.type)?.5:.32,10,false),new THREE.MeshStandardMaterial({color:this.highlighted?.has(c.id)?(this.theme==='dark'?'#ffffff':'#111111'):(this.theme==='dark'?'#aaaaaa':'#666666'),roughness:.55,transparent:true,opacity:this.highlighted?.size&&!this.highlighted.has(c.id)?.18:.9}));
      cable.userData.connectionId=c.id;cable.castShadow=true;this.wires.add(cable);
      // A generous invisible pick tube makes fine wires selectable without
      // changing their visible diameter or intercepting clicks through solids.
      const hit=new THREE.Mesh(new THREE.TubeGeometry(curve,32,1.25,6,false),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.userData.connectionId=c.id;this.wires.add(hit);
      if(/coax/i.test(c.type)){
        const plug=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,.7,32),new THREE.MeshStandardMaterial({color:'#b3a16e',metalness:.8,roughness:.3}));plug.position.copy(from);plug.userData.connectionId=c.id;this.wires.add(plug);
      }
    }
  }
  setSelected(id){this.selected=id;this.transform.detach();const g=this.groups.get(id);const locked=id==='xiao'&&this.state?.lockCore&&this.groups.has('expansion');if(g&&['translate','rotate'].includes(this.mode)&&!this.explode&&!locked){this.transform.attach(g);this.transform.setMode(this.mode);}this.labels.forEach((l,k)=>l.classList.toggle('selected',k===id));this.makePorts();}
  setMode(mode){this.mode=mode;this.setSelected(this.selected);}
  setExplode(value){this.explode=value;this.updatePlacement();this.makeWires();this.setSelected(this.selected);}
  setView(view,partId){
    this.floor.visible=view!=='rear';this.grid.visible=view!=='rear';
    const box=new THREE.Box3().setFromObject(this.groups.get(partId)||this.assembly),center=box.isEmpty()?new THREE.Vector3(0,12,0):box.getCenter(new THREE.Vector3());
    this.orbit.target.copy(center);this.camera.up.set(0,1,0);
    const offset=view==='rear'?new THREE.Vector3(90,-230,150):view==='top'?new THREE.Vector3(0,300,.01):view==='front'?new THREE.Vector3(0,0,-300):new THREE.Vector3(150,190,200);
    if(view==='top')this.camera.up.set(0,0,-1);if(view==='rear')this.camera.up.set(0,0,1);this.camera.position.copy(center).add(offset);this.camera.lookAt(center);this.camera.updateMatrixWorld(true);
    if(!box.isEmpty()){
      const projected=new THREE.Box3();for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(this.camera.matrixWorldInverse));
      const size=projected.getSize(new THREE.Vector3());this.camera.zoom=Math.min(partId?6:3,(this.camera.right-this.camera.left)/(size.x+24),(this.camera.top-this.camera.bottom)/(size.y+45));
    }else this.camera.zoom=1.25;
    this.camera.updateProjectionMatrix();this.orbit.update();
  }
  frame(){
    requestAnimationFrame(()=>this.frame());this.orbit.update();const selected=this.groups.get(this.selected);this.selection.visible=!!selected;if(selected)this.selection.box.setFromObject(selected);
    const placed=[];
    const offsets={expansion:[-90,-10],xiao:[80,-25],battery:[85,30],thermal:[-75,-5],strip:[35,-20]};
    this.labels.forEach((label,id)=>{const g=this.groups.get(id);if(!g)return;const p=g.position.clone();const inst=this.state.instances.find(i=>i.id===id);p.y+=(inst?.dimensions[1]||10)/2+3;p.project(this.camera);const px=(p.x*.5+.5)*this.host.clientWidth,py=(-p.y*.5+.5)*this.host.clientHeight;const offset=offsets[id]||[65,-15];const w=label.offsetWidth||90;let x=Math.max(w/2+8,Math.min(this.host.clientWidth-w/2-8,px+offset[0])),y=Math.max(65,Math.min(this.host.clientHeight-95,py+offset[1]));
      for(let tries=0;tries<8&&placed.some(r=>Math.abs(r.x-x)<(r.w+w)/2+5&&Math.abs(r.y-y)<24);tries++)y+=25;
      placed.push({x,y,w});label.style.left=`${x}px`;label.style.top=`${y}px`;label.hidden=!this.showLabels||p.z>1||px<0||px>this.host.clientWidth||py<0||py>this.host.clientHeight;
      const line=this.leaders.querySelector(`[data-part="${id}"]`);if(line){line.setAttribute('x1',px);line.setAttribute('y1',py);line.setAttribute('x2',x);line.setAttribute('y2',y-9);line.style.display=label.hidden?'none':'';}
    });
    this.renderer.render(this.scene,this.camera);
  }
  async exportGLB(){
    const group=new THREE.Group();for(const i of this.state.instances){const original=this.groups.get(i.id);if(!original)continue;const copy=original.clone(true);copy.position.fromArray(i.position);copy.name=i.id;group.add(copy);}
    return new Promise((resolve,reject)=>new GLTFExporter().parse(group,resolve,reject,{binary:true}));
  }
}
