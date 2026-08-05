-- Development seed template.
--
-- 1. Create two test Auth users first.
-- 2. In a LOCAL, UNCOMMITTED copy of this file, replace the two .invalid
--    emails below with those test-user emails.
-- 3. Run the file again in local Studio or with psql.
--
-- Never commit real user emails or Auth UUIDs to this file.

insert into public.organizations (
  id,
  name,
  slug,
  website_url,
  normalized_domain,
  claim_status,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Acme Software',
  'acme-software',
  'https://acme-software.example',
  'acme-software.example',
  'claimed',
  true
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  website_url = excluded.website_url,
  normalized_domain = excluded.normalized_domain,
  claim_status = excluded.claim_status,
  is_active = excluded.is_active;

do $$
declare
  acme_id constant uuid := '00000000-0000-4000-8000-000000000001';
  admin_user_id uuid;
  member_user_id uuid;
begin
  select id into admin_user_id
  from auth.users
  where email = 'replace-with-admin@example.invalid';

  select id into member_user_id
  from auth.users
  where email = 'replace-with-member@example.invalid';

  if admin_user_id is null or member_user_id is null then
    raise notice 'Acme identity seed skipped: create test users and replace the placeholder emails.';
    return;
  end if;

  insert into public.profiles (id, display_name)
  values
    (admin_user_id, 'Acme Test Administrator'),
    (member_user_id, 'Acme Test Member')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.organization_members (organization_id, user_id, role)
  values
    (acme_id, admin_user_id, 'admin'),
    (acme_id, member_user_id, 'member')
  on conflict (organization_id, user_id) do update set role = excluded.role;

  insert into public.feedback (
    id,
    submitter_id,
    organization_id,
    type,
    title,
    description,
    source_url,
    page_title,
    selected_text,
    status
  ) values
    (
      '10000000-0000-4000-8000-000000000001',
      member_user_id,
      acme_id,
      'feature_request',
      'Schedule weekly reports',
      'Let me schedule the adoption report for Monday mornings.',
      'https://app.acme.test/reports/weekly-adoption',
      'Weekly adoption report - Acme',
      'Export report',
      'planned'
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      member_user_id,
      acme_id,
      'bug',
      'CSV export loses the selected date range',
      'The downloaded CSV includes rows outside the active 30-day filter.',
      'https://app.acme.test/activity',
      'Account activity - Acme',
      null,
      'in_progress'
    ),
    (
      '10000000-0000-4000-8000-000000000003',
      admin_user_id,
      acme_id,
      'confusing_experience',
      'Workspace role labels need descriptions',
      'Add a short explanation beside each role in the member invitation form.',
      'https://app.acme.test/settings/members',
      'Members and roles - Acme',
      'Manager can manage workspace settings',
      'under_review'
    )
  on conflict (id) do nothing;

  insert into public.feedback_responses (
    feedback_id,
    organization_id,
    author_id,
    body
  ) values (
    '10000000-0000-4000-8000-000000000001',
    acme_id,
    admin_user_id,
    'This fits the reporting automation work already on our roadmap.'
  )
  on conflict (feedback_id) do update set body = excluded.body;
end;
$$;
