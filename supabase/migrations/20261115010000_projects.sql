create table public.projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 120),
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 2097152),
 chat jsonb not null default '[]' check (jsonb_typeof(chat) = 'array' and jsonb_array_length(chat) <= 40 and octet_length(chat::text) <= 200000),
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index projects_owner_updated on public.projects(owner_id, updated_at desc);
alter table public.projects enable row level security;
revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;
create policy projects_select on public.projects for select to authenticated using ((select auth.uid()) = owner_id);
create policy projects_insert on public.projects for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy projects_update on public.projects for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy projects_delete on public.projects for delete to authenticated using ((select auth.uid()) = owner_id);

-- Updates use a revision check: an older tab cannot silently replace newer work.
create function public.save_project(p_id uuid, p_document jsonb, p_chat jsonb, p_expected_revision bigint default null)
returns setof public.projects language plpgsql security invoker set search_path = '' as $$
declare result public.projects;
begin
 if auth.uid() is null then raise exception 'Sign in to save a project.'; end if;
 if p_expected_revision is null then
  insert into public.projects(id, owner_id, name, document, chat)
  values(p_id, auth.uid(), p_document->>'name', p_document, p_chat) returning * into result;
 else
  update public.projects set name = p_document->>'name', document = p_document, chat = p_chat,
   revision = revision + 1, updated_at = now()
  where id = p_id and owner_id = auth.uid() and revision = p_expected_revision returning * into result;
  if result.id is null then raise exception 'PROJECT_CONFLICT' using errcode = 'P0001'; end if;
 end if;
 return next result;
end $$;
revoke all on function public.save_project(uuid,jsonb,jsonb,bigint) from public, anon;
grant execute on function public.save_project(uuid,jsonb,jsonb,bigint) to authenticated;

-- Prepared projects are private until claimed by the matching verified Google
-- identity. Emails never appear in client-readable tables or public artifacts.
create table public.pending_projects (
 id uuid primary key default gen_random_uuid(),
 owner_email text not null,
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 2097152),
 created_at timestamptz not null default now()
);
alter table public.pending_projects enable row level security;
revoke all on public.pending_projects from anon, authenticated;
create function public.claim_pending_projects()
returns void language plpgsql security definer set search_path = '' as $$
declare verified_email text;
begin
 select lower(u.email) into verified_email from auth.users u
 where u.id = auth.uid() and u.email_confirmed_at is not null
 and exists(select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google'
  and lower(i.identity_data->>'email') = lower(u.email)
  and i.identity_data->>'email_verified' = 'true');
 if verified_email is null then return; end if;
 insert into public.projects(id, owner_id, name, document)
 select p.id, auth.uid(), p.document->>'name', p.document from public.pending_projects p
 where lower(p.owner_email) = verified_email on conflict(id) do nothing;
 delete from public.pending_projects p where lower(p.owner_email) = verified_email
 and exists(select 1 from public.projects saved where saved.id = p.id and saved.owner_id = auth.uid());
end $$;
revoke all on function public.claim_pending_projects() from public, anon;
grant execute on function public.claim_pending_projects() to authenticated;
