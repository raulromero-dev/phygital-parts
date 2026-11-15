export function validateQuestion(value){
 if(value==null)return null;
 if(typeof value.prompt!=='string'||!value.prompt.trim()||value.prompt.length>500||!Array.isArray(value.options)||value.options.length<2||value.options.length>4||value.options.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||new Set(value.options.map(s=>s.trim().toLowerCase())).size!==value.options.length)throw Error('Invalid assistant question.');
 return {prompt:value.prompt.trim(),options:value.options.map(s=>s.trim())};
}
// One allowlist for local history, account saves and copied projects. Never save
// request headers, keys, provider responses or executable proposal state here.
export function cleanChat(value){
 if(!Array.isArray(value))return [];
 return value.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').slice(-40).map(m=>{
  const result={role:m.role,text:m.text.slice(0,4000),partName:typeof m.partName==='string'?m.partName.slice(0,100):null,applied:!!m.applied};
  if(m.role==='assistant'&&m.question)try{result.question=validateQuestion(m.question);result.answered=!!m.answered;result.target=typeof m.target==='string'?m.target.slice(0,100):null;}catch{}
  return result;
 });
}
export function conversationText(message){
 return [message.text,message.question?.prompt,message.question?.options.join(' / ')].filter(Boolean).join('\n').slice(0,4000);
}
