const examples=['thermal-camera','air-monitor','wearable-haptics','smartwatch','smart-ring'];
export function projectUrl(id,variant='compact'){
 if(id==='phygital')return '/projects/phygital?layout='+(['compact','bench','wide'].includes(variant)?variant:'compact');
 if(!examples.includes(id))throw Error('Unknown starter.');
 return '/examples/'+id;
}
export function projectRoute(url){
 const u=new URL(url,'https://phygitalstudio.app');
 if(u.pathname==='/projects/phygital'){
  const variant=['compact','bench','wide'].includes(u.searchParams.get('layout'))?u.searchParams.get('layout'):'compact';
  return {id:'phygital',variant,key:'phygital-'+variant};
 }
 const id=u.pathname.replace(/^\/examples\//,'');
 return examples.includes(id)&&u.pathname==='/examples/'+id?{id,key:id}:null;
}
