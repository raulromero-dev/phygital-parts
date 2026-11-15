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
 console.log(`${total} database isolation, ownership, verified claim and conflict checks passed (transaction rolled back).`);
}finally{await client.query('rollback').catch(()=>{});await client.end();}
