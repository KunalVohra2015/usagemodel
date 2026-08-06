-- Manual, owner-operated pilot administrator bootstrap.
-- Replace placeholders only in an uncommitted copy run in the hosted SQL Editor.
-- Never commit a real email, UUID, credential, or secret.

begin;

do $$
declare
  target_domain constant text := 'replace-with-domain.example';
  target_slug constant text := 'replace-with-organization-slug';
  target_email constant text := 'replace-with-admin@example.invalid';
  organization_count integer;
  user_count integer;
  target_organization_id uuid;
  target_user_id uuid;
begin
  select count(*)
    into organization_count
  from public.organizations
  where normalized_domain = lower(btrim(target_domain))
     or slug = lower(btrim(target_slug));

  if organization_count <> 1 then
    raise exception 'Bootstrap requires exactly one matching organization; found %', organization_count;
  end if;

  select id into strict target_organization_id
  from public.organizations
  where normalized_domain = lower(btrim(target_domain))
     or slug = lower(btrim(target_slug));

  select count(*)
    into user_count
  from auth.users
  where lower(email) = lower(btrim(target_email));

  if user_count <> 1 then
    raise exception 'Bootstrap requires exactly one matching Auth user; found %', user_count;
  end if;

  select id into strict target_user_id
  from auth.users
  where lower(email) = lower(btrim(target_email));

  update public.organizations
  set claim_status = 'claimed'
  where id = target_organization_id
    and claim_status = 'unclaimed';

  insert into public.organization_members (organization_id, user_id, role)
  values (target_organization_id, target_user_id, 'admin')
  on conflict (organization_id, user_id)
  do update set role = 'admin';
end;
$$;

commit;
