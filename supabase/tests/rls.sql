-- ==============================================================================
-- RLS isolation tests
-- Run in the Supabase SQL editor (or psql as the database owner).
-- The script creates fixture auth users, switches to the authenticated role,
-- asserts visibility and write rules, then rolls everything back.
-- Requires supabase/migrations/20261101090000_production_hardening.sql.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- Expected counts, captured with RLS bypassed.
-- ------------------------------------------------------------------------------
create temp table rls_expected on commit drop as
select
  (select count(*) from public.applications) as all_apps,
  (select count(*) from public.applications where region = 'Northern') as north_apps,
  (select count(*) from public.applications where region = 'Western') as west_apps,
  (select count(*) from public.applications where region = 'Southern') as south_apps,
  (select count(*) from public.applications where institute_id = 'INST-101') as inst101_apps,
  (select count(*) from public.documents) as all_docs,
  (select count(*) from public.documents where institute_id = 'INST-101') as inst101_docs,
  (select count(*) from public.audit_logs) as all_audit;

grant select on rls_expected to authenticated, anon;

-- ------------------------------------------------------------------------------
-- Fixtures: one auth user per scope. The auth trigger creates each profile.
-- ------------------------------------------------------------------------------
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'super@rls.test', crypt('RlsTest!2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"RLS Super","role":"SUPER_ADMIN"}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'north@rls.test', crypt('RlsTest!2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"RLS North Officer","role":"REGIONAL_OFFICER","region":"Northern"}'::jsonb, now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'south@rls.test', crypt('RlsTest!2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"RLS South Officer","role":"REGIONAL_OFFICER","region":"Southern"}'::jsonb, now(), now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'inst101@rls.test', crypt('RlsTest!2026', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"name":"RLS Institute Admin","role":"INSTITUTION_ADMIN","institute_id":"INST-101"}'::jsonb, now(), now())
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- North regional officer
-- ------------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare expected int;
begin
  select north_apps into expected from rls_expected;
  if (select count(*) from public.applications) <> expected then
    raise exception 'North RO sees % applications, expected %', (select count(*) from public.applications), expected;
  end if;
  if exists (select 1 from public.applications where region <> 'Northern') then
    raise exception 'North RO can read an application outside Northern region';
  end if;
  if expected > 0 and not exists (
    select 1 from public.evc_visits where region = 'Northern'
  ) then
    raise exception 'North RO cannot read Northern EVC visits';
  end if;

  begin
    insert into public.applications (
      id, institute_id, institute_name, type, region, state, stage, status,
      last_updated, applied_date, category, contact_email, contact_phone
    ) values (
      'RLS-FORBIDDEN', 'INST-101', 'Forbidden', 'Extension of Approval (EoA)', 'Northern',
      'Delhi', 'Submitted', 'In Progress', '01 Jan 2026', '01 Jan 2026',
      'Engineering & Technology', 'x@y.z', '+91 00000 00000'
    );
    raise exception 'North RO was allowed to create an application';
  exception
    when insufficient_privilege then null;
    when check_violation then null;
  end;
end $$;

reset role;

-- ------------------------------------------------------------------------------
-- South regional officer sees nothing from the sample Northern rows
-- ------------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare expected int;
begin
  select south_apps into expected from rls_expected;
  if (select count(*) from public.applications) <> expected then
    raise exception 'South RO sees % applications, expected %', (select count(*) from public.applications), expected;
  end if;
  if exists (select 1 from public.applications where region = 'Northern') then
    raise exception 'South RO can read a Northern application';
  end if;
  if exists (select 1 from public.documents where region = 'Northern') then
    raise exception 'South RO can read a Northern document';
  end if;
end $$;

reset role;

-- ------------------------------------------------------------------------------
-- Institution admin is limited to its own institute
-- ------------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare expected int;
begin
  select inst101_apps into expected from rls_expected;
  if (select count(*) from public.applications) <> expected then
    raise exception 'Institution admin sees % applications, expected %', (select count(*) from public.applications), expected;
  end if;
  if exists (select 1 from public.applications where institute_id <> 'INST-101') then
    raise exception 'Institution admin can read another institute application';
  end if;

  select inst101_docs into expected from rls_expected;
  if (select count(*) from public.documents) <> expected then
    raise exception 'Institution admin sees % documents, expected %', (select count(*) from public.documents), expected;
  end if;

  if exists (select 1 from public.documents where institute_id = 'INST-101') then
    begin
      update public.documents set verified_by = 'Institution Admin'
      where institute_id = 'INST-101'
        and id in (select id from public.documents where institute_id = 'INST-101' limit 1);
      raise exception 'Institution admin was allowed to record verification';
    exception
      when others then
        if position('competent officer' in sqlerrm) = 0 then
          raise;
        end if;
    end;
  end if;
end $$;

reset role;

-- ------------------------------------------------------------------------------
-- Super admin sees everything but cannot mutate the audit trail
-- ------------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare expected int;
begin
  select all_apps into expected from rls_expected;
  if (select count(*) from public.applications) <> expected then
    raise exception 'Super admin sees % applications, expected %', (select count(*) from public.applications), expected;
  end if;

  select all_audit into expected from rls_expected;
  if (select count(*) from public.audit_logs) <> expected then
    raise exception 'Super admin sees % audit rows, expected %', (select count(*) from public.audit_logs), expected;
  end if;

  begin
    update public.audit_logs set details = 'tampered' where true;
    if found then
      raise exception 'Audit rows were updatable';
    end if;
  exception
    when others then
      if position('append-only' in sqlerrm) = 0 then
        raise;
      end if;
  end;

  begin
    delete from public.audit_logs where true;
    if found then
      raise exception 'Audit rows were deletable';
    end if;
  exception
    when others then
      if position('append-only' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end $$;

reset role;

-- ------------------------------------------------------------------------------
-- Anonymous access is denied everywhere
-- ------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  if (select count(*) from public.applications) <> 0 then
    raise exception 'Anonymous role can read applications';
  end if;
  if (select count(*) from public.institutes) <> 0 then
    raise exception 'Anonymous role can read institutes';
  end if;
  if (select count(*) from public.audit_logs) <> 0 then
    raise exception 'Anonymous role can read audit logs';
  end if;
end $$;

reset role;

rollback;

-- Reaching this line means every isolation assertion passed.
select 'RLS isolation checks passed' as result;
