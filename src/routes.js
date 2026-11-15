const examples=['thermal-camera','air-monitor','wearable-haptics','smartwatch','smart-ring','makeup-cyberdeck'];
export function projectUrl(id,variant='compact'){
 if(/^shared-[a-f0-9-]{36}$/.test(id))return '/share/'+id.slice(7);
 if(id==='phygital')return '/projects/phygital?layout='+(['compact','bench','wide'].includes(variant)?variant:'compact');
 if(/^build-[a-f0-9-]{36}$/.test(id))return '/projects/'+id;
 if(/^local-[a-f0-9-]{36}$/.test(id))return '/projects/'+id;
 if(/^cloud-[a-f0-9-]{36}$/.test(id))return '/projects/'+id;
 if(!examples.includes(id))throw Error('Unknown starter.');
 return '/examples/'+id;
}
export function projectRoute(url){
 const u=new URL(url,'https://phygitalstudio.app');
 const shared=u.pathname.match(/^\/share\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);if(shared)return {id:'shared-'+shared[1],key:'shared-'+shared[1],token:shared[1],shared:true};
 if(u.pathname==='/projects/phygital'){
  const variant=['compact','bench','wide'].includes(u.searchParams.get('layout'))?u.searchParams.get('layout'):'compact';
  return {id:'phygital',variant,key:'phygital-'+variant};
 }
 const build=u.pathname.match(/^\/projects\/(build-[a-f0-9-]{36})$/);if(build)return {id:build[1],key:build[1],generated:true};
 const local=u.pathname.match(/^\/projects\/(local-[a-f0-9-]{36})$/);if(local)return {id:local[1],key:local[1],local:true};
 const cloud=u.pathname.match(/^\/projects\/(cloud-[a-f0-9-]{36})$/);if(cloud)return {id:cloud[1],key:cloud[1],cloud:true};
 const id=u.pathname.replace(/^\/examples\//,'');
 return examples.includes(id)&&u.pathname==='/examples/'+id?{id,key:id}:null;
}
