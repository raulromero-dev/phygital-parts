import { validatePart } from './schema.mjs';
// Scan only complete objects in the top-level parts array. Quotes, escapes and
// nested arrays cannot turn text inside descriptions into a second part.
export function partStream(onPart){
 let text='',offset=0,depth=0,quoted=false,escaped=false,startString=0,rootKey='',inParts=false,partStart=-1,partsDepth=0,count=0;
 const seen=new Set();
 return delta=>{
  text+=delta;if(text.length>1000000)throw Error('Proposal exceeds the stream limit.');
  for(;offset<text.length;offset++){
   const ch=text[offset];
   if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"'){quoted=false;if(depth===1)rootKey=JSON.parse(text.slice(startString,offset+1));}continue;}
   if(ch==='"'){quoted=true;startString=offset;continue;}
   if(ch==='['||ch==='{'){
    if(ch==='['&&depth===1&&rootKey==='parts'){inParts=true;partsDepth=depth+1;}
    else if(inParts&&depth===partsDepth&&ch==='{')partStart=offset;
    depth++;
   }else if(ch===']'||ch==='}'){
    depth--;
    if(inParts&&depth===partsDepth&&partStart>=0){
     const raw=text.slice(partStart,offset+1);partStart=-1;
     const part=validatePart(JSON.parse(raw));
     if(seen.has(part.key)||++count>20)throw Error('Duplicate or excessive draft parts.');
     seen.add(part.key);onPart(part);
    }
    if(inParts&&depth<partsDepth)inParts=false;
   }
  }
 };
}
