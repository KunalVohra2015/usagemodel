-- Loopline MVP database foundation.
-- All application tables use RLS. No policies or grants are provided to anon.

create schema if not exists private;
revoke all on schema private from public, anon;

create type public.organization_role as enum ('member', 'admin');
create type public.feedback_type as enum (
  'feature_request',
  'bug',
  'confusing_experience',
  'other'
);
create type public.feedback_status as enum (
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 100),
  constraint profiles_avatar_url_length
    check (avatar_url is null or char_length(avatar_url) <= 2048),
  constraint profiles_avatar_url_http
    check (avatar_url is null or avatar_url ~* '^https?://')
);

comment on table public.profiles is
  'Public application profile fields only. Authentication email remains in auth.users.';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length
    check (char_length(btrim(name)) between 1 and 120),
  constraint organizations_slug_format
    check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_length
    check (char_length(slug) between 2 and 80),
  constraint organizations_slug_unique unique (slug)
);

create unique index organizations_name_lower_idx
  on public.organizations (lower(name));

create table public.organization_members (
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_organization_id_idx
  on public.organization_members (user_id, organization_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references auth.users (id) on delete restrict,
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  type public.feedback_type not null,
  title text not null,
  description text not null,
  source_url text not null,
  page_title text not null,
  selected_text text,
  screenshot_path text,
  status public.feedback_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_title_length
    check (char_length(btrim(title)) between 1 and 200),
  constraint feedback_description_length
    check (char_length(btrim(description)) between 1 and 10000),
  constraint feedback_source_url_length
    check (char_length(source_url) between 8 and 2048),
  constraint feedback_source_url_http
    check (source_url ~* '^https?://'),
  constraint feedback_page_title_length
    check (char_length(btrim(page_title)) between 1 and 300),
  constraint feedback_selected_text_length
    check (selected_text is null or char_length(selected_text) <= 10000),
  constraint feedback_screenshot_path_length
    check (screenshot_path is null or char_length(screenshot_path) <= 1024),
  constraint feedback_screenshot_path_scope
    check (
      screenshot_path is null
      or screenshot_path = id::text || '/screenshot'
    ),
  constraint feedback_id_organization_unique unique (id, organization_id)
);

create index feedback_submitter_id_created_at_idx
  on public.feedback (submitter_id, created_at desc);
create index feedback_organization_id_created_at_idx
  on public.feedback (organization_id, created_at desc);
create index feedback_organization_id_status_created_at_idx
  on public.feedback (organization_id, status, created_at desc);

create table public.feedback_status_history (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback (id) on delete cascade,
  previous_status public.feedback_status,
  new_status public.feedback_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint feedback_status_history_changed
    check (previous_status is null or previous_status <> new_status)
);

create index feedback_status_history_feedback_id_created_at_idx
  on public.feedback_status_history (feedback_id, created_at);
create index feedback_status_history_changed_by_idx
  on public.feedback_status_history (changed_by)
  where changed_by is not null;

create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null,
  organization_id uuid not null
    references public.organizations (id) on delete restrict,
  author_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_responses_feedback_organization_fkey
    foreign key (feedback_id, organization_id)
    references public.feedback (id, organization_id) on delete cascade,
  constraint feedback_responses_feedback_unique unique (feedback_id),
  constraint feedback_responses_body_length
    check (char_length(btrim(body)) between 1 and 10000)
);

create index feedback_responses_organization_id_idx
  on public.feedback_responses (organization_id);
create index feedback_responses_author_id_idx
  on public.feedback_responses (author_id);

-- Trigger helpers are kept outside the exposed public schema.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create function private.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Profile identity and creation time cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_profile_fields()
  from public, anon, authenticated;

create trigger profiles_protect_fields
before update on public.profiles
for each row execute function private.protect_profile_fields();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create trigger feedback_set_updated_at
before update on public.feedback
for each row execute function private.set_updated_at();

create trigger feedback_responses_set_updated_at
before update on public.feedback_responses
for each row execute function private.set_updated_at();

-- Membership checks bypass membership-table RLS, but always bind the lookup to
-- auth.uid(). The private schema is not exposed through the Data API.
create function private.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members as member
      where member.organization_id = target_organization_id
        and member.user_id = (select auth.uid())
    );
$$;

create function private.is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members as member
      where member.organization_id = target_organization_id
        and member.user_id = (select auth.uid())
        and member.role = 'admin'
    );
$$;

create function private.can_access_feedback(target_feedback_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.feedback as item
      where item.id = target_feedback_id
        and (
          item.submitter_id = (select auth.uid())
          or exists (
            select 1
            from public.organization_members as member
            where member.organization_id = item.organization_id
              and member.user_id = (select auth.uid())
          )
        )
    );
$$;

create function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      target_user_id = (select auth.uid())
      or exists (
        select 1
        from public.feedback as item
        join public.organization_members as member
          on member.organization_id = item.organization_id
        where item.submitter_id = target_user_id
          and member.user_id = (select auth.uid())
      )
    );
$$;

revoke all on function private.is_organization_member(uuid) from public, anon;
revoke all on function private.is_organization_admin(uuid) from public, anon;
revoke all on function private.can_access_feedback(uuid) from public, anon;
revoke all on function private.can_view_profile(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
grant execute on function private.can_access_feedback(uuid) to authenticated;
grant execute on function private.can_view_profile(uuid) to authenticated;

-- Browser callers may either associate the submitter's canonical screenshot or
-- change status as an organization admin. These operations cannot be combined,
-- and ownership and content fields remain immutable.
create function private.protect_feedback_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(
    new.id,
    new.submitter_id,
    new.organization_id,
    new.type,
    new.title,
    new.description,
    new.source_url,
    new.page_title,
    new.selected_text,
    new.created_at
  ) is distinct from row(
    old.id,
    old.submitter_id,
    old.organization_id,
    old.type,
    old.title,
    old.description,
    old.source_url,
    old.page_title,
    old.selected_text,
    old.created_at
  ) then
    raise exception 'Feedback ownership and content fields cannot be changed';
  end if;

  if new.screenshot_path is distinct from old.screenshot_path then
    if new.status is distinct from old.status
      or old.screenshot_path is not null
      or new.screenshot_path <> old.id::text || '/screenshot'
      or (select auth.uid()) is null
      or (select auth.uid()) <> old.submitter_id
    then
      raise exception 'Only the submitter may associate the canonical screenshot once';
    end if;
  elsif new.status is distinct from old.status
    and not (select private.is_organization_admin(old.organization_id))
  then
    raise exception 'Only an organization administrator may change feedback status';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_feedback_fields()
  from public, anon, authenticated;

create trigger feedback_protect_fields
before update on public.feedback
for each row execute function private.protect_feedback_fields();

create function private.protect_feedback_response_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.id, new.feedback_id, new.organization_id, new.author_id, new.created_at)
    is distinct from
    row(old.id, old.feedback_id, old.organization_id, old.author_id, old.created_at)
  then
    raise exception 'Response ownership fields cannot be changed';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_feedback_response_fields()
  from public, anon, authenticated;

create trigger feedback_responses_protect_fields
before update on public.feedback_responses
for each row execute function private.protect_feedback_response_fields();

create function private.record_feedback_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.feedback_status_history (
      feedback_id,
      previous_status,
      new_status,
      changed_by
    ) values (
      new.id,
      null,
      new.status,
      coalesce((select auth.uid()), new.submitter_id)
    );
  elsif new.status is distinct from old.status then
    insert into public.feedback_status_history (
      feedback_id,
      previous_status,
      new_status,
      changed_by
    ) values (
      new.id,
      old.status,
      new.status,
      (select auth.uid())
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_feedback_status_history()
  from public, anon, authenticated;

create trigger feedback_record_status_history
after insert or update of status on public.feedback
for each row execute function private.record_feedback_status_history();

-- RLS is enabled on every application table before privileges are granted.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.feedback enable row level security;
alter table public.feedback_status_history enable row level security;
alter table public.feedback_responses enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_members from anon, authenticated;
revoke all on public.feedback from anon, authenticated;
revoke all on public.feedback_status_history from anon, authenticated;
revoke all on public.feedback_responses from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert on public.feedback to authenticated;
grant update (status, screenshot_path) on public.feedback to authenticated;
grant select on public.feedback_status_history to authenticated;
grant select, insert, update on public.feedback_responses to authenticated;

create policy profiles_select_authorized
on public.profiles for select
to authenticated
using ((select private.can_view_profile(id)));

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy organizations_select_active_or_member
on public.organizations for select
to authenticated
using (
  is_active
  or (select private.is_organization_member(id))
);

create policy organization_members_select_own
on public.organization_members for select
to authenticated
using (user_id = (select auth.uid()));

create policy feedback_select_submitter_or_member
on public.feedback for select
to authenticated
using (
  submitter_id = (select auth.uid())
  or (select private.is_organization_member(organization_id))
);

create policy feedback_insert_as_submitter
on public.feedback for insert
to authenticated
with check (
  submitter_id = (select auth.uid())
  and status = 'submitted'
  and screenshot_path is null
  and exists (
    select 1
    from public.organizations as organization
    where organization.id = feedback.organization_id
      and organization.is_active
  )
);

create policy feedback_update_status_as_admin
on public.feedback for update
to authenticated
using ((select private.is_organization_admin(organization_id)))
with check ((select private.is_organization_admin(organization_id)));

create policy feedback_associate_screenshot_as_submitter
on public.feedback for update
to authenticated
using (
  submitter_id = (select auth.uid())
  and screenshot_path is null
)
with check (
  submitter_id = (select auth.uid())
  and screenshot_path = id::text || '/screenshot'
);

create policy feedback_status_history_select_authorized
on public.feedback_status_history for select
to authenticated
using ((select private.can_access_feedback(feedback_id)));

create policy feedback_responses_select_authorized
on public.feedback_responses for select
to authenticated
using ((select private.can_access_feedback(feedback_id)));

create policy feedback_responses_insert_as_member
on public.feedback_responses for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.is_organization_member(organization_id))
  and exists (
    select 1
    from public.feedback as item
    where item.id = feedback_responses.feedback_id
      and item.organization_id = feedback_responses.organization_id
  )
);

create policy feedback_responses_update_as_author_or_admin
on public.feedback_responses for update
to authenticated
using (
  author_id = (select auth.uid())
  or (select private.is_organization_admin(organization_id))
)
with check (
  author_id = (select auth.uid())
  or (select private.is_organization_admin(organization_id))
);

-- Private screenshot bucket. Bucket limits are enforced by Storage; the
-- application must also validate file size and MIME type before upload.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'feedback-screenshots',
  'feedback-screenshots',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_write_feedback_screenshot(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is not null
      and object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/screenshot$'
    then exists (
        select 1
        from public.feedback as item
        where item.id = split_part(object_name, '/', 1)::uuid
          and item.submitter_id = (select auth.uid())
          and object_name = item.id::text || '/screenshot'
      )
    else false
  end;
$$;

create function private.can_read_feedback_screenshot(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is not null
      and object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/screenshot$'
    then exists (
        select 1
        from public.feedback as item
        where item.id = split_part(object_name, '/', 1)::uuid
          and object_name = item.id::text || '/screenshot'
          and (
            item.submitter_id = (select auth.uid())
            or exists (
              select 1
              from public.organization_members as member
              where member.organization_id = item.organization_id
                and member.user_id = (select auth.uid())
            )
          )
      )
    else false
  end;
$$;

revoke all on function private.can_write_feedback_screenshot(text)
  from public, anon;
revoke all on function private.can_read_feedback_screenshot(text)
  from public, anon;
grant execute on function private.can_write_feedback_screenshot(text)
  to authenticated;
grant execute on function private.can_read_feedback_screenshot(text)
  to authenticated;

create policy feedback_screenshots_insert_by_submitter
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'feedback-screenshots'
  and (select private.can_write_feedback_screenshot(name))
);

create policy feedback_screenshots_select_authorized
on storage.objects for select
to authenticated
using (
  bucket_id = 'feedback-screenshots'
  and (select private.can_read_feedback_screenshot(name))
);
