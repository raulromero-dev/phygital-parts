import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { createHash } from 'node:crypto';
import { modelUrl } from '../src/model-data.js';

export function publicAddress(ip){
 const a=ip.split('.').map(Number);if(a.length!==4||a.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [x,y,z]=a;return !(x===0||x===10||x===127||x>=224||x===169&&y===254||x===172&&y>=16&&y<=31||x===192&&(y===168||y===0||y===2)||x===100&&y>=64&&y<=127||x===198&&(y===18||y===19||y===51&&z===100)||x===203&&y===0&&z===113);
}
// Pin DNS for every hop, including redirects. Never proxy private addresses.
export async function fetchAsset(value,signal,redirects=0){
 const safe=modelUrl(value);if(!safe)throw Error('A public HTTPS asset is required.');
 const url=new URL(safe);if(url.port&&url.port!=='443')throw Error('Unsupported asset port.');
 const addresses=await lookup(url.hostname,{family:4,all:true});
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Asset host is unavailable.');
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const request=https.get(url,{signal,headers:{Accept:'*/*','User-Agent':'PhygitalStudio/1.0'},lookup:(_h,options,callback)=>options.all?callback(null,[addresses[0]]):callback(null,addresses[0].address,4)},response=>{
   if([301,302,303,307,308].includes(response.statusCode)){response.resume();if(redirects>=3){reject(Error('Too many asset redirects.'));return;}fetchAsset(new URL(response.headers.location,url).href,signal,redirects+1).then(resolve,reject);return;}
   if(response.statusCode!==200){response.resume();reject(Error('Source asset could not be downloaded.'));return;}
   const chunks=[];let bytes=0;
   response.on('data',chunk=>{bytes+=chunk.length;if(bytes>2800000){response.destroy(Error('Source asset exceeds the 2.8 MB preview limit.'));return;}chunks.push(chunk);});
   response.on('error',reject);response.on('end',()=>resolve({bytes:Buffer.concat(chunks),url:url.href,type:response.headers['content-type']||''}));
  });
  request.setTimeout(20000,()=>request.destroy(Error('Source asset timed out.')));request.on('error',reject);
 });
}
export async function runAsset(body,_key,_fetch,signal,download=fetchAsset){
 try{
  if(!['glb','stl','step'].includes(body?.format))throw Error('Unsupported CAD format.');
  const asset=await download(body.url,signal);const bytes=asset.bytes;
  const head=bytes.subarray(0,100).toString();
  if(body.format==='glb'&&bytes.readUInt32LE(0)!==0x46546c67||body.format==='step'&&!/ISO-10303-21/i.test(head)||body.format==='stl'&&!/^\s*solid\b/i.test(head)&&!(bytes.length>=84&&84+bytes.readUInt32LE(80)*50===bytes.length))throw Error('The source did not return a supported CAD file.');
  return {status:200,body:{data:bytes.toString('base64'),hash:createHash('sha256').update(bytes).digest('hex'),format:body.format,url:asset.url}};
 }catch(error){return {status:422,body:{error:error.message||'CAD could not be downloaded.'}};}
}
