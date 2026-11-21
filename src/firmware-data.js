const text=(v,n)=>typeof v==='string'&&v.length<=n;
export const MAX_FIRMWARE_BYTES=600000;
export const FIRMWARE_BUILTIN='phygital-tft';
export function firmwareBytes(base64){return Uint8Array.from(atob(base64),c=>c.charCodeAt(0));}
export function validateFirmwareBundle(v){
 if(!v||v.format!=='phygital-firmware'||v.version!==1||v.pixelFormat!=='rgb565'||!text(v.name,100)||!v.name.trim()||![v.width,v.height].every(n=>Number.isInteger(n)&&n>=16&&n<=1024))throw Error('Choose a Phygital firmware preview bundle (version 1, RGB565).');
 if(!text(v.wasm,MAX_FIRMWARE_BYTES*4/3)||!v.wasm.length||v.wasm.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(v.wasm))throw Error('The compiled preview is invalid or exceeds 600 KB.');
 const bytes=firmwareBytes(v.wasm);checkWasmLimits(bytes);
 if(!Array.isArray(v.scenes)||!v.scenes.length||v.scenes.length>32||v.scenes.some(s=>!text(s,80)||!s.trim()))throw Error('Include 1–32 named test scenes.');
 const inputs=v.inputs??[],seen=new Set();
 if(!Array.isArray(inputs)||inputs.length>12)throw Error('Include at most 12 simulated inputs.');
 for(const i of inputs){if(!i||!Number.isInteger(i.id)||i.id<0||i.id>255||seen.has(i.id)||!text(i.name,80)||!i.name.trim()||![i.min,i.max,i.step,i.value].every(Number.isFinite)||i.min>=i.max||i.step<=0||i.value<i.min||i.value>i.max||Math.abs(i.min)>1e6||Math.abs(i.max)>1e6||!text(i.unit??'',20))throw Error('Invalid simulated input.');seen.add(i.id);}
 let sourceUrl='';if(v.sourceUrl){try{const u=new URL(v.sourceUrl);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.href.length>2000)throw 0;sourceUrl=u.href;}catch{throw Error('Use a public HTTP(S) source link.');}}
 const clean={format:'phygital-firmware',version:1,name:v.name.trim(),width:v.width,height:v.height,pixelFormat:'rgb565',wasm:v.wasm,scenes:[...v.scenes],inputs:inputs.map(i=>({id:i.id,name:i.name,min:i.min,max:i.max,step:i.step,value:i.value,unit:i.unit||''})),sourceUrl,revision:text(v.revision,100)?v.revision:'',sha256:/^[a-f0-9]{64}$/.test(v.sha256)?v.sha256:''};
 if(v.session!==undefined)clean.session=validateFirmwareSession(v.session,clean);
 return clean;
}

// Save controllable test settings, never arbitrary VM memory or executable code.
export function validateFirmwareSession(value,bundle){
 if(!value||!Number.isInteger(value.scene)||value.scene<0||value.scene>=(bundle?.scenes.length??32)||typeof value.paused!=='boolean'||!Array.isArray(value.inputs)||value.inputs.length>12)throw Error('Invalid saved simulation settings.');
 const seen=new Set();
 const inputs=value.inputs.map(i=>{
  const spec=bundle?.inputs.find(input=>input.id===i?.id);
  if(!i||!Number.isInteger(i.id)||i.id<0||i.id>255||seen.has(i.id)||!Number.isFinite(i.value)||Math.abs(i.value)>1e6||(bundle&&(!spec||i.value<spec.min||i.value>spec.max)))throw Error('Invalid saved simulation input.');
  seen.add(i.id);return {id:i.id,value:i.value};
 });
 return {scene:value.scene,paused:value.paused,inputs};
}

// Inspect declared allocations before instantiation, including a potentially
// hostile module start function. Imports are separately restricted by runtime.
export function checkWasmLimits(bytes){
 if(bytes.length>MAX_FIRMWARE_BYTES||bytes.length<8||[0,97,115,109,1,0,0,0].some((b,i)=>bytes[i]!==b))throw Error('Not a supported WebAssembly module.');
 let p=8,memories=0;
 const uint=()=>{let n=0;for(let i=0;i<5;i++){if(p>=bytes.length)throw Error('Truncated module.');const b=bytes[p++];n+=(b&127)*2**(7*i);if(!(b&128)){if(n>0xffffffff)throw Error('Invalid module integer.');return n;}}throw Error('Invalid module integer.');};
 while(p<bytes.length){const id=bytes[p++],size=uint(),end=p+size;if(end>bytes.length)throw Error('Truncated module.');
  if(id===5){const count=uint();if(count!==1)throw Error('A preview needs one bounded memory.');memories=count;const flags=uint(),min=uint(),max=flags===1?uint():Infinity;if(flags!==1||min>max||max>512)throw Error('Preview memory must be bounded to 32 MB.');}
  if(id===4){const count=uint();if(count>1)throw Error('Unsupported preview table.');for(let i=0;i<count;i++){p++;const flags=uint(),min=uint(),max=flags===1?uint():Infinity;if(flags!==1||min>max||max>4096)throw Error('Preview table must be bounded to 4096 entries.');}}
  if(p>end)throw Error('Invalid module section.');p=end;
 }
 if(memories!==1)throw Error('A preview must define its own bounded memory.');
}
export function validateFirmwareState(value,ids){
 if(value==null)return null;
 if(!value||!ids.includes(value.partId)||!['phygital-tft','imported'].includes(value.profile))throw Error('Choose a component for the firmware preview.');
 const bundle=value.profile==='imported'?validateFirmwareBundle(value.bundle):null;
 return {partId:value.partId,profile:value.profile,...(bundle?{bundle}:{}),...(value.session!==undefined?{session:validateFirmwareSession(value.session,bundle)}:{})};
}
