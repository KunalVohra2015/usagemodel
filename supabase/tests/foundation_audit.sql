-- Run after the foundation migration. Every fixture is rolled back.
begin;

do $$
declare
  application_tables constant text[] := array[
    'profiles',
    'organizations',
    'organization_members',
    'feedback',
    'feedback_status_history',
    'feedback_responses'
  ];
  missing_rls text[];
begin
  select array_agg(expected_table)
  into missing_rls
  from unnest(application_tables) as expected_table
  where not exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = expected_table
      and relation.relrowsecurity
  );

  if missing_rls is not null then
    raise exception 'RLS is missing on: %', missing_rls;
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = any(application_tables)
      and ('anon' = any(roles) or 'public' = any(roles))
  ) then
    raise exception 'An application-table policy grants anon or public access';
  end if;

  if has_table_privilege('anon', 'public.profiles', 'select')
    or has_table_privilege('anon', 'public.organizations', 'select')
    or has_table_privilege('anon', 'public.organization_members', 'select')
    or has_table_privilege('anon', 'public.feedback', 'select')
    or has_table_privilege('anon', 'public.feedback_status_history', 'select')
    or has_table_privilege('anon', 'public.feedback_responses', 'select')
  then
    raise exception 'The anon role has application-table read privileges';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.organization_members',
    'insert'
  ) then
    raise exception 'Browser users can self-assign organization membership';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.feedback',
    'submitter_id',
    'update'
  ) or has_column_privilege(
    'authenticated',
    'public.feedback',
    'organization_id',
    'update'
  ) or has_column_privilege(
    'authenticated',
    'public.feedback',
    'title',
    'update'
  ) then
    raise exception 'Browser users can update immutable feedback columns';
  end if;

  if not has_column_privilege(
    'authenticated',
    'public.feedback',
    'status',
    'update'
  ) or not has_column_privilege(
    'authenticated',
    'public.feedback',
    'screenshot_path',
    'update'
  ) then
    raise exception 'Required feedback update column privileges are missing';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'feedback-screenshots'
      and not public
      and file_size_limit = 5242880
      and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
  ) then
    raise exception 'Private screenshot bucket constraints are missing';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'feedback_screenshots_insert_by_submitter',
        'feedback_screenshots_select_authorized'
      )
  ) <> 2 then
    raise exception 'Screenshot insert or read policy is missing';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'feedback_screenshots_%'
      and cmd in ('UPDATE', 'ALL')
  ) then
    raise exception 'Screenshot replacement must remain disabled in this slice';
  end if;
end;
$$;

create function pg_temp.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'Audit assertion failed: %', message;
  end if;
end;
$$;

create function pg_temp.expect_rejected(command text, message text)
returns void
language plpgsql
as $$
declare
  affected_rows integer;
begin
  begin
    execute command;
    get diagnostics affected_rows = row_count;
  exception when others then
    return;
  end;

  if affected_rows <> 0 then
    raise exception 'Audit assertion failed: %', message;
  end if;
end;
$$;

-- Synthetic Auth identities are transaction-scoped and require no real emails.
insert into auth.users (id)
values
  ('00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000104');

insert into public.organizations (
  id,
  name,
  slug,
  website_url,
  normalized_domain
)
values (
  '00000000-0000-4000-8000-000000000201',
  'Foundation Audit Organization',
  'foundation-audit-organization',
  'https://foundation-audit.example.com',
  'foundation-audit.example.com'
);

insert into public.organization_members (organization_id, user_id, role)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000102',
    'member'
  ),
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000103',
    'admin'
  );

insert into public.feedback (
  id,
  submitter_id,
  organization_id,
  type,
  title,
  description,
  source_url,
  page_title
)
select
  fixture.id,
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'bug',
  'Screenshot audit ' || fixture.ordinal,
  'Transaction-scoped screenshot authorization fixture.',
  'https://audit.example.test/feedback/' || fixture.ordinal,
  'Screenshot audit fixture'
from (
  values
    ('00000000-0000-4000-8000-000000000301'::uuid, 1),
    ('00000000-0000-4000-8000-000000000302'::uuid, 2),
    ('00000000-0000-4000-8000-000000000303'::uuid, 3),
    ('00000000-0000-4000-8000-000000000304'::uuid, 4),
    ('00000000-0000-4000-8000-000000000305'::uuid, 5),
    ('00000000-0000-4000-8000-000000000306'::uuid, 6)
) as fixture(id, ordinal);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000101',
  true
);

-- The owner can upload and associate exactly the canonical path.
select pg_temp.assert_true(
  private.can_write_feedback_screenshot(
    '00000000-0000-4000-8000-000000000301/screenshot'
  ),
  'owner cannot upload the canonical screenshot'
);
update public.feedback
set screenshot_path = id::text || '/screenshot'
where id = '00000000-0000-4000-8000-000000000301';
select pg_temp.assert_true(
  (
    select screenshot_path = id::text || '/screenshot'
    from public.feedback
    where id = '00000000-0000-4000-8000-000000000301'
  ),
  'owner cannot associate the canonical screenshot'
);

select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/extra'
    where id = '00000000-0000-4000-8000-000000000302'$$,
  'an arbitrary screenshot path was accepted'
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = '00000000-0000-4000-8000-000000000302/screenshot'
    where id = '00000000-0000-4000-8000-000000000303'$$,
  'another feedback item path was accepted'
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/replacement'
    where id = '00000000-0000-4000-8000-000000000301'$$,
  'a second screenshot path was accepted'
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set status = 'planned'
    where id = '00000000-0000-4000-8000-000000000301'$$,
  'a non-admin submitter changed status'
);

-- Additional filenames and malformed paths fail without unsafe UUID casts.
select pg_temp.assert_true(
  not private.can_write_feedback_screenshot(
    '00000000-0000-4000-8000-000000000301/extra'
  ),
  'an additional screenshot filename was authorized'
);
select pg_temp.assert_true(
  not private.can_write_feedback_screenshot('not-a-uuid/screenshot'),
  'a malformed screenshot path was authorized'
);
select pg_temp.assert_true(
  private.can_read_feedback_screenshot(
    '00000000-0000-4000-8000-000000000301/screenshot'
  ),
  'the submitter cannot read an authorized screenshot'
);

-- An unrelated authenticated user cannot associate or read the screenshot.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000104',
  true
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/screenshot'
    where id = '00000000-0000-4000-8000-000000000304'$$,
  'another user associated a screenshot'
);
select pg_temp.assert_true(
  not private.can_read_feedback_screenshot(
    '00000000-0000-4000-8000-000000000301/screenshot'
  ),
  'an unrelated user can read a screenshot'
);

-- Organization members can read routed screenshots but cannot modify paths.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000102',
  true
);
select pg_temp.assert_true(
  private.can_read_feedback_screenshot(
    '00000000-0000-4000-8000-000000000301/screenshot'
  ),
  'an organization member cannot read an authorized screenshot'
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/screenshot'
    where id = '00000000-0000-4000-8000-000000000305'$$,
  'an organization member associated a screenshot'
);

-- Admin status updates remain valid, but admins cannot claim another user's path.
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000103',
  true
);
update public.feedback
set status = 'under_review'
where id = '00000000-0000-4000-8000-000000000306';
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/screenshot'
    where id = '00000000-0000-4000-8000-000000000305'$$,
  'an organization admin associated another submitter screenshot'
);

-- Bypass column grants and RLS to prove the trigger itself protects immutable
-- content and rejects combining screenshot association with another change.
reset role;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000101',
  true
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/screenshot', title = 'Changed title'
    where id = '00000000-0000-4000-8000-000000000306'$$,
  'immutable feedback content changed during screenshot association'
);
select pg_temp.expect_rejected(
  $$update public.feedback
    set screenshot_path = id::text || '/screenshot', status = 'planned'
    where id = '00000000-0000-4000-8000-000000000306'$$,
  'status changed during screenshot association'
);

select 'Foundation audit passed' as result;
rollback;
