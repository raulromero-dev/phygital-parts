export const GAME={left:-8,right:8,top:5,bottom:-5,playerX:-4.8,halfWidth:.30,halfHeight:.30,gravity:9.6,jump:4.4,speed:2.65,gap:4.1,gateWidth:.68,spacing:5.4,total:6};
export function newFlight(random=Math.random){
 return {phase:'ready',y:0,velocity:0,distance:0,score:0,time:0,gateCenters:Array.from({length:GAME.total},(_,i)=>i===GAME.total-1?0:(random()-.5)*3.6),reason:null};
}
export const gateX=(state,index)=>6+index*GAME.spacing-state.distance;
export const targetX=state=>6+(GAME.total-1)*GAME.spacing+5-state.distance;
export function jump(state){if(state.phase==='ready')state.phase='playing';if(state.phase==='playing')state.velocity=GAME.jump;}
export function togglePause(state){if(state.phase==='playing')state.phase='paused';else if(state.phase==='paused')state.phase='playing';}
export function advanceFlight(state,seconds){
 if(state.phase!=='playing')return state;
 let remaining=Math.min(Math.max(seconds,0),.1);
 while(remaining>0&&state.phase==='playing'){
  const dt=Math.min(remaining,1/120);remaining-=dt;state.time+=dt;state.distance+=GAME.speed*dt;state.velocity-=GAME.gravity*dt;state.y+=state.velocity*dt;
  if(state.y+GAME.halfHeight>GAME.top||state.y-GAME.halfHeight<GAME.bottom){state.phase='lost';state.reason='edge';break;}
  for(let i=0;i<GAME.total;i++){
   const x=gateX(state,i),near=Math.abs(x-GAME.playerX)<GAME.gateWidth/2+GAME.halfWidth;
   if(near&&Math.abs(state.y-state.gateCenters[i])+GAME.halfHeight>GAME.gap/2){state.phase='lost';state.reason='contact';break;}
   if(x+GAME.gateWidth/2<GAME.playerX-GAME.halfWidth)state.score=Math.max(state.score,i+1);
  }
  if(state.phase!=='playing')break;
  const dock=targetX(state)-1.3;
  if(dock<GAME.playerX+GAME.halfWidth&&Math.abs(state.y)<.65){state.phase='won';state.score=GAME.total;state.velocity=0;}
  else if(dock<GAME.playerX-GAME.halfWidth){state.phase='lost';state.reason='dock';}
 }
 return state;
}
