export const MAX_CHAT_IMAGES=4, MAX_IMAGE_BYTES=512*1024, MAX_CHAT_IMAGE_BYTES=2*1024*1024;
export function validateChatImages(value=[]){
 if(!Array.isArray(value)||value.length>MAX_CHAT_IMAGES)throw Error('Attach up to four photos.');
 let bytes=0;
 for(const image of value){
  if(typeof image!=='string'||image.length>MAX_IMAGE_BYTES*1.34+100)throw Error('A chat photo is too large. Reattach it to resize.');
  const match=image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match||match[2].length%4)throw Error('Use JPG, PNG or WebP photos.');
  let raw;try{raw=atob(match[2]);}catch{throw Error('The photo could not be read.');}
  const valid=match[1]==='jpeg'?raw.startsWith('\xff\xd8\xff'):match[1]==='png'?raw.startsWith('\x89PNG\r\n\x1a\n'):raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP';
  if(!valid||raw.length>MAX_IMAGE_BYTES)throw Error('The photo format or size is invalid.');
  bytes+=raw.length;
 }
 if(bytes>MAX_CHAT_IMAGE_BYTES)throw Error('Attach up to 2 MB of resized photos.');
 return [...value];
}

export async function prepareChatPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Choose a JPG, PNG or WebP photo up to 12 MB.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('This photo could not be opened. Try exporting it as JPG.');}
 try{
  let scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  for(let attempt=0;attempt<4;attempt++){
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const data=canvas.toDataURL('image/jpeg',.85-attempt*.08);
   if(data.length<=MAX_IMAGE_BYTES*4/3){validateChatImages([data]);return data;}
   scale*=.8;
  }
  throw Error('This photo is too detailed. Try a smaller crop.');
 }finally{bitmap.close();}
}
