import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GAME, newFlight, jump, togglePause, advanceFlight, gateX, targetX } from './cable-game-physics.js';
import { materials, cableModel, chipModel, gateModel, batchModel } from './cable-game-models.js';
import './cable-game.css';
let opened=false;
export async function openCableGame({getState=()=>({}),isBuilding=()=>false}={}){
 if(opened)return;opened=true;
 const previousFocus=document.activeElement,dialog=document.createElement('dialog');dialog.className='cable-game';dialog.setAttribute('aria-labelledby','cable-game-title');
 dialog.innerHTML=`<header class="cable-game-header"><div><span class="game-eyebrow">Phygital arcade</span><h2 id="cable-game-title">Cable Hop</h2></div><div class="game-header-actions"><button id="game-pause" class="icon-button" aria-label="Pause game" title="Pause · P" disabled>Ⅱ</button><button id="game-close" class="icon-button" aria-label="Close game">×</button></div></header><div class="cable-game-stage"><div class="game-hud"><span id="game-score">0 <small>/ 6</small></span><span id="game-best"></span></div><div class="game-canvas" tabindex="0" role="application" aria-label="Cable Hop. Press Space or tap to jump. Pass six connectors and reach the chip. P pauses the game."></div><div class="game-overlay"><span class="game-kicker">Four wires. One connection.</span><h3 id="game-result">Make the connection.</h3><p id="game-instruction">Hop through the gaps. Dock into the chip.</p><button class="button primary" id="game-start" disabled>Preparing components…</button></div><div class="game-flight-hint" hidden>Tap or <kbd>Space</kbd> to hop</div><p class="sr-only" id="game-announcement" role="status" aria-live="polite"></p></div><footer class="cable-game-footer"><span id="game-build-status"></span><span>Tap / Space <span aria-hidden="true">↑</span> <span class="game-desktop-control">· P to pause</span></span></footer>`;
 document.body.append(dialog);dialog.showModal();const $=s=>dialog.querySelector(s),stage=$('.cable-game-stage'),host=$('.game-canvas');
 let renderer,scene,camera,player,chip,pmremTarget,frameId,observer,closed=false,flight=newFlight(),previous=performance.now(),lastPhase='',lastScore=-1,best=0,wonAt=0,gates=[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{best=Math.min(6,Math.max(0,Number(localStorage.getItem('phygital.cable-hop.best'))||0));}catch{}
 const announce=text=>{$('#game-announcement').textContent=text;};
 const buildStatus=()=>{$('#game-build-status').textContent=isBuilding()?'Codex is working in the background':getState().build?.status==='complete'?'Build ready · close to review':'Your project stays open';};
 document.addEventListener('phygital:state',buildStatus);buildStatus();
 function updateUi(){
  if(flight.score!==lastScore){lastScore=flight.score;$('#game-score').innerHTML=`${flight.score} <small>/ 6</small>`;if(flight.score>best){best=flight.score;try{localStorage.setItem('phygital.cable-hop.best',String(best));}catch{}}$('#game-best').textContent=best?'Best '+best+'/6':'';$('.game-flight-hint').innerHTML=flight.score===6?'Aim for the chip’s socket':'Tap or <kbd>Space</kbd> to hop';}
  if(flight.phase===lastPhase)return;lastPhase=flight.phase;dialog.dataset.phase=flight.phase;
  $('.game-overlay').hidden=flight.phase==='playing';$('.game-flight-hint').hidden=flight.phase!=='playing';$('#game-pause').disabled=!['playing','paused'].includes(flight.phase);$('#game-pause').textContent=flight.phase==='paused'?'▷':'Ⅱ';$('#game-pause').setAttribute('aria-label',flight.phase==='paused'?'Resume game':'Pause game');$('#game-pause').title=flight.phase==='paused'?'Resume · P':'Pause · P';
  const content={ready:['Four wires. One connection.','Make the connection.','Hop through the gaps. Dock into the chip.','Start flight'],paused:['Take your time','Flight paused','Your cable is right where you left it.','Resume'],lost:['Contact lost',flight.reason==='dock'?'Almost connected.':'Give it another hop.',flight.reason==='dock'?'Aim for the socket in the center.':`${flight.score} of 6 gaps cleared. The next run is yours.`,'Try again'],won:['Signal found','Connected.','Six clean passes. One perfect connection.','Fly again']}[flight.phase];
  if(flight.phase==='playing')announce('Flying. Tap or press Space to jump.');
  if(content){$('.game-kicker').textContent=content[0];$('#game-result').textContent=content[1];$('#game-instruction').textContent=content[2];$('#game-start').textContent=content[3];announce(content[1]);}
  if(flight.phase==='won')wonAt=performance.now();
 }
 function start(){if(!renderer)return;if(flight.phase==='paused'){togglePause(flight);}else if(flight.phase!=='playing'){flight=newFlight();for(let i=0;i<gates.length;i++){gates[i].top.position.y=flight.gateCenters[i]+GAME.gap/2;gates[i].bottom.position.y=flight.gateCenters[i]-GAME.gap/2;}jump(flight);}updateUi();host.focus();previous=performance.now();}
 function hop(){if(['ready','lost','won'].includes(flight.phase))start();else if(flight.phase==='playing')jump(flight);}
 function pause(){togglePause(flight);updateUi();previous=performance.now();}
 $('#game-start').onclick=start;$('#game-pause').onclick=pause;
 host.addEventListener('pointerdown',event=>{event.preventDefault();hop();host.focus();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')return;if(event.target.closest('button'))return;if(event.code==='Space'||event.key==='ArrowUp'){event.preventDefault();if(!event.repeat)hop();}else if(event.key.toLowerCase()==='p'){event.preventDefault();pause();}});
 const visibility=()=>{if(document.hidden&&flight.phase==='playing'){flight.phase='paused';updateUi();}};document.addEventListener('visibilitychange',visibility);
 function freeScene(){const geometries=new Set(),mats=new Set(),textures=new Set();scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])mats.add(m);});mats.forEach(m=>{if(m.map)textures.add(m.map);m.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());pmremTarget?.dispose();renderer?.dispose();renderer?.forceContextLoss();}
 function dispose(){if(closed)return;closed=true;opened=false;cancelAnimationFrame(frameId);observer?.disconnect();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('phygital:state',buildStatus);freeScene();dialog.remove();previousFocus?.isConnected&&previousFocus.focus();
 }
 $('#game-close').onclick=()=>dialog.close();dialog.addEventListener('close',dispose,{once:true});
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,100);camera.position.set(0,0,24);
  const env=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);pmremTarget=pmrem.fromScene(env,.045);scene.environment=pmremTarget.texture;scene.environmentIntensity=.6;env.dispose();pmrem.dispose();scene.add(new THREE.HemisphereLight(0xffffff,0x596575,1.6));
  const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(-4,7,12);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-12,right:12,top:9,bottom:-9});light.shadow.bias=-.0005;light.shadow.normalBias=.04;scene.add(light);const fill=new THREE.DirectionalLight(0xa3c3df,1.4);fill.position.set(6,-3,8);scene.add(fill);
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(40,20),new THREE.ShadowMaterial({opacity:.1}));backdrop.position.z=-.7;backdrop.receiveShadow=true;scene.add(backdrop);
  const m=materials();[player,chip]=await Promise.all([batchModel(cableModel(m)),batchModel(chipModel(m))]);scene.add(player,chip);player.rotation.x=-.18;player.rotation.y=-.23;chip.rotation.x=-.12;chip.rotation.y=-.2;
  const gate=await batchModel(gateModel(m,10));
  for(const y of [-5,5]){const line=new THREE.Mesh(new THREE.BoxGeometry(24,.025,.01),new THREE.MeshBasicMaterial({color:'#b69b56',transparent:true,opacity:.28}));line.position.set(0,y,-.4);scene.add(line);}
  for(let i=0;i<GAME.total;i++){const top=gate.clone(),bottom=gate.clone();top.position.y=flight.gateCenters[i]+GAME.gap/2;bottom.position.y=flight.gateCenters[i]-GAME.gap/2;bottom.rotation.z=Math.PI;scene.add(top,bottom);gates.push({top,bottom});}
  const resize=()=>{const {width,height}=host.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);const aspect=width/height;camera.left=-8;camera.right=8;camera.top=8/aspect;camera.bottom=-8/aspect;camera.updateProjectionMatrix();}};
  observer=new ResizeObserver(resize);observer.observe(host);resize();$('#game-start').disabled=false;updateUi();
  if(closed){observer?.disconnect();freeScene();return;}
  function frame(now){if(closed)return;frameId=requestAnimationFrame(frame);const dt=(now-previous)/1000;previous=now;if(!document.hidden)advanceFlight(flight,dt);updateUi();
   const idle=flight.phase==='ready';const showCourse=!idle;for(let i=0;i<gates.length;i++){const x=gateX(flight,i);for(const g of [gates[i].top,gates[i].bottom]){g.position.x=x;g.visible=showCourse&&x>-9&&x<9;}}
   player.scale.setScalar(idle?1.5:1);chip.scale.setScalar(idle?1.5:1);player.position.set(idle?-3.3:GAME.playerX,idle?1.15+(!reduced?Math.sin(now*.0018)*.12:0):flight.y,.32);player.rotation.z=idle?-.07:THREE.MathUtils.clamp(flight.velocity*.06,-.35,.23);
   chip.position.set(idle?3.5:targetX(flight),idle?1.15:0,0);chip.visible=idle||chip.position.x<10;chip.rotation.z=idle?-.08:0;
   if(flight.phase==='won'){const t=Math.min((now-wonAt)/600,1),ease=t*t*(3-2*t);player.position.y=flight.y*(1-ease);player.rotation.z*=1-ease;player.position.x=GAME.playerX+(chip.position.x-1.70-GAME.playerX)*ease;}
   renderer.render(scene,camera);
  }frameId=requestAnimationFrame(frame);
 }catch{if(!closed){$('#game-result').textContent='3D is unavailable here';$('#game-instruction').textContent='Try a browser with WebGL enabled. Your project is unaffected.';$('#game-start').hidden=true;}}
}
