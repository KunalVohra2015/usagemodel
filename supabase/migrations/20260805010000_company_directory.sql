-- User-expandable public company directory.
-- The applied foundation migration remains unchanged.

create type public.organization_claim_status as enum (
  'unclaimed',
  'claimed',
  'verified'
);

alter table public.organizations
  add column website_url text,
  add column normalized_domain text,
  add column claim_status public.organization_claim_status
    not null default 'unclaimed',
  add column created_by uuid references auth.users (id) on delete set null;

-- Existing pilot organizations predate the directory. Reserved .example domains
-- make the migration deterministic without claiming a real-world domain.
update public.organizations
set
  website_url = 'https://' || slug || '.example',
  normalized_domain = slug || '.example',
  claim_status = 'claimed'
where website_url is null or normalized_domain is null;

alter table public.organizations
  alter column website_url set not null,
  alter column normalized_domain set not null,
  add constraint organizations_website_url_length
    check (char_length(website_url) between 9 and 2048),
  add constraint organizations_website_url_canonical
    check (
      website_url = lower(website_url)
      and website_url ~ '^https://[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
      and regexp_replace(website_url, '^https://', '') = normalized_domain
    ),
  add constraint organizations_normalized_domain_length
    check (char_length(normalized_domain) between 4 and 253),
  add constraint organizations_normalized_domain_format
    check (
      normalized_domain = lower(normalized_domain)
      and normalized_domain !~ '^www\.'
      and normalized_domain ~
        '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
      and normalized_domain ~ '\.[a-z][a-z0-9-]{1,62}$'
    ),
  add constraint organizations_unclaimed_public_domain
    check (
      claim_status <> 'unclaimed'
      or (
        normalized_domain !~ '^[0-9.]+$'
        and normalized_domain <> 'localhost'
        and normalized_domain !~ '\.localhost$'
        and normalized_domain !~ '\.(local|internal|test|invalid|example)$'
      )
    ),
  add constraint organizations_name_no_markup
    check (name !~ '[<>]' and name !~ '[[:cntrl:]]');

drop index public.organizations_name_lower_idx;
create index organizations_name_lower_idx
  on public.organizations (lower(name));
create unique index organizations_normalized_domain_unique_idx
  on public.organizations (normalized_domain);
create index organizations_created_by_idx
  on public.organizations (created_by)
  where created_by is not null;

comment on column public.organizations.website_url is
  'Canonical HTTPS origin only: scheme plus normalized domain, without path, query, fragment, credentials, or port.';
comment on column public.organizations.normalized_domain is
  'Lowercase IDNA ASCII hostname. Leading www is removed; meaningful subdomains are preserved.';
comment on column public.organizations.claim_status is
  'Directory verification state. Browser creation can only produce unclaimed rows.';
comment on column public.organizations.created_by is
  'Authenticated directory contributor; does not confer organization membership.';

create function public.find_or_create_unclaimed_organization(
  company_name text,
  company_website text
)
returns table (
  id uuid,
  name text,
  slug text,
  website_url text,
  normalized_domain text,
  claim_status public.organization_claim_status,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  clean_name text := btrim(company_name);
  clean_website text := lower(btrim(company_website));
  domain_value text;
  base_slug text;
  slug_value text;
  organization_id uuid := gen_random_uuid();
  inserted public.organizations%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_name is null
    or char_length(clean_name) not between 2 and 120
    or clean_name ~ '[<>]'
    or clean_name ~ '[[:cntrl:]]'
  then
    raise exception 'Invalid company name' using errcode = '22023';
  end if;

  -- This privileged boundary accepts only the canonical representation emitted
  -- by the application normalizer. It deliberately uses character validation,
  -- not inet or URL casts, so malformed attacker input fails predictably.
  if clean_website is null
    or char_length(clean_website) not between 9 and 2048
    or clean_website !~ '^https://[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    or clean_website ~ '[[:space:][:cntrl:]]'
  then
    raise exception 'Website must be a canonical HTTPS origin'
      using errcode = '22023';
  end if;

  domain_value := regexp_replace(clean_website, '^https://', '');
  if char_length(domain_value) not between 4 and 253
    or domain_value ~ '^www\.'
    or domain_value ~ '^[0-9.]+$'
    or domain_value = 'localhost'
    or domain_value ~ '\.localhost$'
    or domain_value ~ '\.(local|internal|test|invalid|example)$'
    or domain_value !~ '\.[a-z][a-z0-9-]{1,62}$'
    or domain_value !~
      '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  then
    raise exception 'Invalid normalized company domain' using errcode = '22023';
  end if;

  -- Serialize creators of the same domain. The unique index is the final guard;
  -- this lock lets both callers receive the same row without mutating it.
  perform pg_advisory_xact_lock(hashtextextended(domain_value, 0));

  select organization.* into inserted
  from public.organizations as organization
  where organization.normalized_domain = domain_value;

  if found then
    return query select
      inserted.id,
      inserted.name,
      inserted.slug,
      inserted.website_url,
      inserted.normalized_domain,
      inserted.claim_status,
      false;
    return;
  end if;

  base_slug := left(
    trim(both '-' from regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g')),
    63
  );
  if char_length(base_slug) < 2 then
    base_slug := 'company';
  end if;
  slug_value := base_slug;

  if exists (
    select 1 from public.organizations as organization
    where organization.slug = slug_value
  ) then
    slug_value := base_slug || '-' || left(replace(organization_id::text, '-', ''), 8);
  end if;

  begin
    insert into public.organizations (
      id,
      name,
      slug,
      website_url,
      normalized_domain,
      claim_status,
      created_by,
      is_active
    ) values (
      organization_id,
      clean_name,
      slug_value,
      clean_website,
      domain_value,
      'unclaimed',
      caller_id,
      true
    )
    returning * into inserted;
  exception when unique_violation then
    -- A concurrent slug collision may still occur for different domains.
    slug_value := left(base_slug, 63) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
    insert into public.organizations (
      id, name, slug, website_url, normalized_domain,
      claim_status, created_by, is_active
    ) values (
      organization_id, clean_name, slug_value, clean_website, domain_value,
      'unclaimed', caller_id, true
    )
    returning * into inserted;
  end;

  return query select
    inserted.id,
    inserted.name,
    inserted.slug,
    inserted.website_url,
    inserted.normalized_domain,
    inserted.claim_status,
    true;
end;
$$;

revoke all on function public.find_or_create_unclaimed_organization(text, text)
  from public, anon;
grant execute on function public.find_or_create_unclaimed_organization(text, text)
  to authenticated;

create function public.get_public_company_by_slug(company_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  website_url text,
  normalized_domain text,
  claim_status public.organization_claim_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    organization.id,
    organization.name,
    organization.slug,
    organization.website_url,
    organization.normalized_domain,
    organization.claim_status
  from public.organizations as organization
  where organization.slug = company_slug
    and organization.is_active
  limit 1;
$$;

revoke all on function public.get_public_company_by_slug(text)
  from public;
grant execute on function public.get_public_company_by_slug(text)
  to anon, authenticated;

create function public.get_public_company_by_domain(company_domain text)
returns table (
  id uuid,
  name text,
  slug text,
  website_url text,
  normalized_domain text,
  claim_status public.organization_claim_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    organization.id,
    organization.name,
    organization.slug,
    organization.website_url,
    organization.normalized_domain,
    organization.claim_status
  from public.organizations as organization
  where organization.normalized_domain = lower(company_domain)
    and organization.is_active
  limit 1;
$$;

revoke all on function public.get_public_company_by_domain(text)
  from public;
grant execute on function public.get_public_company_by_domain(text)
  to anon, authenticated;
