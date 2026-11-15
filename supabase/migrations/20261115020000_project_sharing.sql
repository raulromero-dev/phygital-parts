-- Sharing publishes an explicit snapshot, never the owner's private live row.
create table public.project_shares (
 token uuid primary key default gen_random_uuid(),
 project_id uuid not null unique references public.projects(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 2097152),
 updated_at timestamptz not null default now()
);
alter table public.project_shares enable row level security;
revoke all on public.project_shares from anon, authenticated;
grant select on public.project_shares to authenticated;
create policy shares_owner_select on public.project_shares for select to authenticated using ((select auth.uid()) = owner_id);

-- Allowlist top-level assembly fields. Prompts, research, chat, notes, purchase
-- decisions, account identifiers and future private fields are not published.
create function public.shared_document(p_document jsonb)
returns jsonb language sql immutable set search_path = '' as $$
 select jsonb_build_object(
  'version',p_document->'version','name',p_document->'name',
  'instances',p_document->'instances','enclosure',p_document->'enclosure',
  'enclosureVisible',p_document->'enclosureVisible','lockCore',p_document->'lockCore',
  'assumptions',jsonb_build_object('current',p_document#>'{assumptions,current}','usable',p_document#>'{assumptions,usable}'),
  'custom',coalesce((select jsonb_agg(c) from jsonb_array_elements(coalesce(p_document->'custom','[]')) c
    where exists(select 1 from jsonb_array_elements(p_document->'instances') i where i->>'id'=c->>'id')),'[]'),
  'connections',coalesce((select jsonb_agg(c) from jsonb_array_elements(coalesce(p_document->'connections','[]')) c
    where exists(select 1 from jsonb_array_elements(p_document->'instances') i where i->>'id'=split_part(c->>'from',':',1))
    and exists(select 1 from jsonb_array_elements(p_document->'instances') i where i->>'id'=split_part(c->>'to',':',1))),'[]'),
  'notes','[]'::jsonb,'decisions','{}'::jsonb,'preset','blank'
 )
$$;
revoke all on function public.shared_document(jsonb) from public, anon, authenticated;

create function public.publish_project(p_id uuid, p_expected_revision bigint)
returns table(token uuid, updated_at timestamptz) language plpgsql security definer set search_path = '' as $$
declare source public.projects;
begin
 select * into source from public.projects where id=p_id and owner_id=auth.uid() for update;
 if source.id is null then raise exception 'Project unavailable.'; end if;
 if p_expected_revision is null or source.revision<>p_expected_revision then raise exception 'PROJECT_CONFLICT'; end if;
 return query insert into public.project_shares as s(project_id,owner_id,document)
 values(source.id,auth.uid(),public.shared_document(source.document))
 on conflict(project_id) do update set document=excluded.document,updated_at=now()
 returning s.token,s.updated_at;
end $$;

create function public.get_shared_project(p_token uuid)
returns table(document jsonb, updated_at timestamptz) language sql security definer stable set search_path = '' as $$
 select s.document,s.updated_at from public.project_shares s where s.token=p_token
$$;

-- Revocation removes only the public snapshot. Existing remixes are independent.
create function public.revoke_project_share(p_id uuid)
returns void language sql security definer set search_path = '' as $$
 delete from public.project_shares where project_id=p_id and owner_id=auth.uid()
$$;

create function public.remix_shared_project(p_token uuid)
returns setof public.projects language plpgsql security definer set search_path = '' as $$
declare source jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to remix.'; end if;
 select document into source from public.project_shares where token=p_token;
 if source is null then raise exception 'This shared link is no longer available.'; end if;
 source=jsonb_set(source,'{name}',to_jsonb(left(source->>'name',111)||' · remix'));
 return query insert into public.projects(owner_id,name,document,chat)
 values(auth.uid(),source->>'name',source,'[]') returning *;
end $$;

revoke all on function public.publish_project(uuid,bigint), public.get_shared_project(uuid), public.revoke_project_share(uuid), public.remix_shared_project(uuid) from public, anon, authenticated;
grant execute on function public.get_shared_project(uuid) to anon, authenticated;
grant execute on function public.publish_project(uuid,bigint), public.revoke_project_share(uuid), public.remix_shared_project(uuid) to authenticated;
