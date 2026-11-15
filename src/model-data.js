// Bounded, declarative geometry only. Never execute generated modelling code.
const number=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
const vector=(v,a,b)=>Array.isArray(v)&&v.length===3&&v.every(n=>number(n,a,b));
const text=(v,n)=>typeof v==='string'&&v.length<=n;
export function modelUrl(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(u.hostname)&&u.hostname.includes('.')?u.href:null;}catch{return null;}
}
export function modelEvidence(value){
 if(!value||typeof value!=='object')return null;
 const cadUrl=modelUrl(value.cadUrl),cadSourceUrl=modelUrl(value.cadSourceUrl),imageUrl=modelUrl(value.imageUrl),imageSourceUrl=modelUrl(value.imageSourceUrl);
 return {cadUrl:cadSourceUrl&&['glb','stl','step'].includes(value.cadFormat)?cadUrl:null,cadFormat:['glb','stl','step'].includes(value.cadFormat)?value.cadFormat:null,cadSourceUrl,imageUrl:imageSourceUrl?imageUrl:null,imageSourceUrl};
}
export function validateRecipe(value){
 if(!value||!text(value.notes,2000)||!Array.isArray(value.shapes)||!value.shapes.length||value.shapes.length>128)throw Error('Invalid model geometry.');
 return {notes:value.notes,shapes:value.shapes.map(s=>{
  if(!['box','cylinder','sphere'].includes(s.type)||!vector(s.size,.001,1)||!vector(s.position,-.5,.5)||!vector(s.rotation,-360,360)||!/^#[a-f0-9]{6}$/i.test(s.color)||!number(s.metalness,0,1)||!number(s.roughness,.05,1))throw Error('Invalid model detail.');
  return {type:s.type,size:[...s.size],position:[...s.position],rotation:[...s.rotation],color:s.color,metalness:s.metalness,roughness:s.roughness};
 })};
}
export function normalizeVisual(value){
 if(!value)return undefined;
 if(value.type==='image')return {type:'image',recipe:validateRecipe(value.recipe),imageUrl:modelUrl(value.imageUrl),sourceUrl:modelUrl(value.sourceUrl)};
 if(value.type==='cad'&&modelUrl(value.url)&&modelUrl(value.sourceUrl)&&['glb','stl','step'].includes(value.format)&&/^[a-f0-9]{64}$/.test(value.hash))return {type:'cad',url:modelUrl(value.url),sourceUrl:modelUrl(value.sourceUrl),format:value.format,hash:value.hash};
 return undefined;
}
