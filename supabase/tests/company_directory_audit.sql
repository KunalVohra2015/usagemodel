-- Run after all migrations. Fixtures and directory rows are rolled back.
begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'Directory audit failed: %', message;
  end if;
end;
$$;

create function pg_temp.expect_rejected(command text, message text)
returns void language plpgsql as $$
begin
  begin
    execute command;
  exception when others then
    return;
  end;
  raise exception 'Directory audit failed: %', message;
end;
$$;

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.organizations', 'insert'),
  'authenticated users have direct organization insert privilege'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.organization_members', 'insert'),
  'authenticated users can self-assign membership'
);
select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.find_or_create_unclaimed_organization(text,text)',
    'execute'
  ),
  'anonymous users can create directory records'
);
select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.find_or_create_unclaimed_organization(text,text)',
    'execute'
  ),
  'authenticated users cannot execute the directory RPC'
);
select pg_temp.assert_true(
  (
    select prosecdef and proconfig @> array['search_path=""']
    from pg_proc
    where oid = 'public.find_or_create_unclaimed_organization(text,text)'::regprocedure
  ),
  'creation RPC is not SECURITY DEFINER with an empty search_path'
);

insert into auth.users (id)
values
  ('00000000-0000-4000-8000-000000000401'),
  ('00000000-0000-4000-8000-000000000402');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000401', true);

create temporary table first_result as
select * from public.find_or_create_unclaimed_organization(
  'Directory Audit Company',
  'https://directory-audit.example.com'
);

select pg_temp.assert_true(
  (select created and claim_status = 'unclaimed' from first_result),
  'new company was not created as unclaimed'
);
select pg_temp.assert_true(
  (
    select created_by = '00000000-0000-4000-8000-000000000401'::uuid
    from public.organizations
    where id = (select id from first_result)
  ),
  'created_by was not bound to auth.uid()'
);
select pg_temp.assert_true(
  not exists (
    select 1 from public.organization_members
    where organization_id = (select id from first_result)
  ),
  'company creation granted membership'
);

create temporary table duplicate_result as
select * from public.find_or_create_unclaimed_organization(
  'Misleading Duplicate Name',
  'https://directory-audit.example.com'
);
select pg_temp.assert_true(
  (
    select duplicate_result.id = first_result.id and not duplicate_result.created
    from duplicate_result cross join first_result
  ),
  'duplicate normalized domain did not reuse the existing organization'
);

create temporary table slug_collision_result as
select * from public.find_or_create_unclaimed_organization(
  'Directory Audit Company',
  'https://different-directory-audit.example.com'
);
select pg_temp.assert_true(
  (
    select slug_collision_result.slug <> first_result.slug
    from slug_collision_result cross join first_result
  ),
  'slug collision did not produce a distinct stable route'
);

select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization(
    '<script>Bad</script>', 'https://bad-name.example.com'
  )$$,
  'HTML-like company name was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization(
    'Bad URL', 'https://valid-company.example.com/path'
  )$$,
  'non-canonical website was accepted'
);

-- Exercise the privileged RPC directly. Every value is attacker-controlled
-- text; rejection must occur without inet, UUID, or URL casts.
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('IPv4', 'https://127.0.0.1')$$,
  'loopback IPv4 was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('IPv4', 'https://10.0.0.1')$$,
  'private IPv4 was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('IPv4', 'https://192.168.1.1')$$,
  'private IPv4 was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('IPv4', 'https://169.254.1.1')$$,
  'link-local IPv4 was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('IPv6', 'https://[::1]')$$,
  'loopback IPv6 was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Localhost', 'localhost')$$,
  'bare localhost was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Localhost', 'https://foo.localhost')$$,
  'localhost subdomain was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Local', 'https://service.local')$$,
  'local development suffix was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Internal', 'https://service.internal')$$,
  'internal development suffix was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Test', 'https://example.test')$$,
  'reserved test suffix was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Credentials', 'https://user:pass@valid-company.example.com')$$,
  'embedded credentials were accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Port', 'https://valid-company.example.com:8443')$$,
  'unexpected port was accepted'
);
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization('Numeric', 'https://999.999.999.999')$$,
  'malformed numeric host was accepted'
);

create temporary table subdomain_result as
select * from public.find_or_create_unclaimed_organization(
  'Valid Application Subdomain',
  'https://app.valid-company.example.com'
);
select pg_temp.assert_true(
  (
    select normalized_domain = 'app.valid-company.example.com'
      and website_url = 'https://app.valid-company.example.com'
      and claim_status = 'unclaimed'
    from subdomain_result
  ),
  'valid public subdomain did not retain its canonical host'
);

reset role;
select pg_temp.expect_rejected(
  $$insert into public.organizations (
      name, slug, website_url, normalized_domain, claim_status
    ) values (
      'Mismatched Host', 'mismatched-host',
      'https://one-valid-company.example.com',
      'other-valid-company.example.com', 'unclaimed'
    )$$,
  'website URL and normalized domain mismatch was accepted'
);

set local role anon;
select pg_temp.expect_rejected(
  $$select * from public.find_or_create_unclaimed_organization(
    'Anonymous Company', 'https://anonymous-company.example.com'
  )$$,
  'anonymous company creation succeeded'
);

rollback;
