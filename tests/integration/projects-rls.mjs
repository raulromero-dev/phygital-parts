import {defaultState} from '../../src/catalog.js';
// Run explicitly against a migrated Supabase database. Every fixture is rolled
// back; this script sends no mail and creates no persistent test accounts.
import pg from 'pg';import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const url=new URL(process.env.DATABASE_URL),client=new pg.Client({host:url.hostname,port:Number(url.port||5432),user:decodeURIComponent(url.username),database:url.pathname.slice(1),password:process.env.PGPASSWORD||decodeURIComponent(url.password),ssl:{rejectUnauthorized:true,...(process.env.PGSSLROOTCERT?{ca:fs.readFileSync(process.env.PGSSLROOTCERT,'utf8')}:{})}});
const a=randomUUID(),b=randomUUID(),pa=randomUUID(),pb=randomUUID(),pending=randomUUID(),email='phygital-rls-'+a+'@example.test';let total=0;
async function as(id){await client.query('reset role');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);await client.query('set local role authenticated');}
async function deny(fn,pattern){await client.query('savepoint expected_failure');try{await assert.rejects(fn,pattern);total++;}finally{await client.query('rollback to savepoint expected_failure');}}
try{
 await client.connect();await client.query('begin');
 for(const [id,address]of [[a,email],[b,'phygital-rls-'+b+'@example.test']])await client.query("insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,aud,role) values($1,$2,now(),'{}','{}','authenticated','authenticated')",[id,address]);
 await client.query("insert into public.pending_projects(id,owner_email,document) values($1,$2,$3)",[pending,email,{name:'Prepared fixture'}]);
 await as(a);await client.query('select * from public.save_project($1,$2,$3,null)',[pa,{name:'A'},'[]']);
 await as(b);await client.query('select * from public.save_project($1,$2,$3,null)',[pb,{name:'B'},'[]']);
 assert.deepEqual((await client.query('select id from public.projects')).rows.map(r=>r.id),[pb]);total++;
 assert.equal((await client.query('update public.projects set name=$1 where id=$2',['intrusion',pa])).rowCount,0);total++;
 await deny(()=>client.query('insert into public.projects(id,owner_id,name,document) values($1,$2,$3,$4)',[randomUUID(),a,'forbidden',{}]),/row-level security/);
 await deny(()=>client.query('select * from public.pending_projects'),/permission denied/);
 await deny(()=>client.query('select * from public.save_project($1,$2,$3,1)',[pa,{name:'intrusion'},'[]']),/PROJECT_CONFLICT/);
 await as(a);const saved=await client.query('select * from public.save_project($1,$2,$3,1)',[pa,{name:'A2'},'[]']);assert.equal(Number(saved.rows[0].revision),2);total++;
 await deny(()=>client.query('select * from public.save_project($1,$2,$3,1)',[pa,{name:'stale'},'[]']),/PROJECT_CONFLICT/);
 await client.query('select public.claim_pending_projects()');assert.equal((await client.query('select id from public.projects where id=$1',[pending])).rowCount,0);total++;
 await client.query('reset role');await client.query("insert into auth.identities(user_id,provider_id,provider,identity_data) values($1,$2,'google',$3)",[a,a,{sub:a,email,email_verified:true}]);
 await as(a);await client.query('select public.claim_pending_projects()');assert.equal((await client.query('select owner_id from public.projects where id=$1',[pending])).rows[0].owner_id,a);total++;
 await as(b);assert.equal((await client.query('select id from public.projects where id=$1',[pending])).rowCount,0);total++;
 await client.query('reset role');await client.query('set local role anon');await deny(()=>client.query('select * from public.projects'),/permission denied/);await deny(()=>client.query('select public.claim_pending_projects()'),/permission denied/);

 // Public links never grant access to private documents or to edit the source.
 const fixture=defaultState();fixture.name='Sharing fixture';fixture.notes=[{part:'thermal',text:'Private note',at:new Date().toISOString()}];fixture.brief='Private prompt';fixture.research={summary:'Private research'};fixture.projectLinks=['https://example.com/private'];fixture.futurePrivate='Do not publish';fixture.assumptions.futurePrivate='Do not publish';
 await as(a);await client.query('select * from public.save_project($1,$2,$3,2)',[pa,fixture,JSON.stringify([{role:'user',text:'Private chat'}])]);
 const published=(await client.query('select * from public.publish_project($1,3)',[pa])).rows[0];
 const token=published.token;
 await deny(()=>client.query('select * from public.publish_project($1,2)',[pa]),/PROJECT_CONFLICT/);
 await as(b);assert.equal((await client.query('select * from public.project_shares')).rowCount,0);total++;
 await deny(()=>client.query('select * from public.publish_project($1,3)',[pa]),/unavailable/);
 await deny(()=>client.query('update public.project_shares set document=$1 where token=$2',[{},token]),/permission denied/);
 await client.query('select public.revoke_project_share($1)',[pa]);
 await client.query('reset role');await client.query('set local role anon');
 await deny(()=>client.query('select * from public.project_shares'),/permission denied/);
 await deny(()=>client.query('select * from public.remix_shared_project($1)',[token]),/permission denied/);
 await deny(()=>client.query('select * from public.publish_project($1,3)',[pa]),/permission denied/);
 const publicDoc=(await client.query('select * from public.get_shared_project($1)',[token])).rows[0].document;
 assert.equal(publicDoc.name,fixture.name);assert.deepEqual(publicDoc.instances,fixture.instances);total++;
 assert.deepEqual(publicDoc.notes,[]);assert.deepEqual(publicDoc.decisions,{});assert.deepEqual(publicDoc.assumptions,{current:fixture.assumptions.current,usable:fixture.assumptions.usable});total++;
 for(const key of ['chat','brief','research','projectLinks','futurePrivate','owner_id'])assert.equal(publicDoc[key],undefined);total++;
 assert.equal((await client.query('select * from public.get_shared_project($1)',[randomUUID()])).rowCount,0);total++;
 await as(b);const remixed=(await client.query('select * from public.remix_shared_project($1)',[token])).rows[0];
 assert.equal(remixed.owner_id,b);assert.notEqual(remixed.id,pa);assert.deepEqual(remixed.chat,[]);assert.equal(remixed.name,'Sharing fixture · remix');total++;
 const changed={...remixed.document,name:'My independent remix'};
 await client.query('select * from public.save_project($1,$2,$3,1)',[remixed.id,changed,'[]']);
 await as(a);assert.equal((await client.query('select document from public.projects where id=$1',[pa])).rows[0].document.name,'Sharing fixture');total++;
 assert.equal((await client.query('select id from public.projects where id=$1',[remixed.id])).rowCount,0);total++;
 fixture.name='Owner private edit';await client.query('select * from public.save_project($1,$2,$3,3)',[pa,fixture,'[]']);
 assert.equal((await client.query('select * from public.get_shared_project($1)',[token])).rows[0].document.name,'Sharing fixture');total++;
 assert.equal((await client.query('select * from public.publish_project($1,4)',[pa])).rows[0].token,token);total++;
 assert.equal((await client.query('select * from public.get_shared_project($1)',[token])).rows[0].document.name,'Owner private edit');total++;
 await client.query('select public.revoke_project_share($1)',[pa]);
 await client.query('reset role');await client.query('set local role anon');assert.equal((await client.query('select * from public.get_shared_project($1)',[token])).rowCount,0);total++;
 await as(b);await deny(()=>client.query('select * from public.remix_shared_project($1)',[token]),/no longer available/);
 assert.equal((await client.query('select name from public.projects where id=$1',[remixed.id])).rows[0].name,'My independent remix');total++;
 await as(a);assert.notEqual((await client.query('select * from public.publish_project($1,4)',[pa])).rows[0].token,token);total++;
 console.log(`${total} database privacy, ownership, sharing, remix, revocation and conflict checks passed (transaction rolled back).`);
}finally{await client.query('rollback').catch(()=>{});await client.end();}
