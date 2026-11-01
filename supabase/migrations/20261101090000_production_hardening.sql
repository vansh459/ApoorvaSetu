-- ==============================================================================
-- ApoorvaSetu production hardening
-- Replaces the hackathon "public full access" policies with role-scoped RLS,
-- completes the schema the client repository already reads, and makes the
-- audit trail append-only. Idempotent: safe to re-run.
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Complete the columns the application already reads
-- ------------------------------------------------------------------------------
alter table public.applications
  add column if not exists route_id text,
  add column if not exists stage_entered_at text,
  add column if not exists stage_due_at text,
  add column if not exists sla_tier text,
  add column if not exists assigned_officer_id text,
  add column if not exists deficiencies jsonb not null default '[]'::jsonb,
  add column if not exists returns jsonb not null default '[]'::jsonb,
  add column if not exists decision jsonb,
  add column if not exists case_summary text,
  add column if not exists evc_visit_id text,
  add column if not exists last_action_by text,
  add column if not exists version integer not null default 1;

alter table public.evc_visits
  add column if not exists scheduled_at text,
  add column if not exists report_due_at text,
  add column if not exists report_submitted_at text,
  add column if not exists sla_tier text,
  add column if not exists escalation_level integer not null default 0,
  add column if not exists report jsonb,
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists evidence_files jsonb not null default '[]'::jsonb;

alter table public.compliance_records
  add column if not exists undertaking_id text,
  add column if not exists verified_at text,
  add column if not exists verified_by text,
  add column if not exists escalation_level integer not null default 0;

alter table public.documents
  add column if not exists expiry_tier text;

alter table public.notifications
  add column if not exists dedupe_key text,
  add column if not exists event_type text,
  add column if not exists target_user_id text;

alter table public.audit_logs
  add column if not exists event_type text,
  add column if not exists correlation_id text,
  add column if not exists source text;

alter table public.system_config
  add column if not exists stage_slas jsonb,
  add column if not exists escalation_matrix jsonb,
  add column if not exists notification_rules jsonb,
  add column if not exists document_warning_days jsonb not null default '[60,30,7]'::jsonb,
  add column if not exists undertaking_warning_days jsonb not null default '[30,15,7]'::jsonb,
  add column if not exists business_days_only boolean not null default false;

create index if not exists applications_region_idx on public.applications (region);
create index if not exists applications_institute_idx on public.applications (institute_id);
create index if not exists applications_evc_visit_idx on public.applications (evc_visit_id);
create index if not exists evc_visits_application_idx on public.evc_visits (application_id);
create index if not exists documents_institute_idx on public.documents (institute_id);
create index if not exists notifications_dedupe_idx on public.notifications (dedupe_key);

-- ------------------------------------------------------------------------------
-- 2. Tables the client repository and cron already use
-- ------------------------------------------------------------------------------
create table if not exists public.undertakings (
  id text primary key,
  application_id text not null,
  institute_id text not null references public.institutes(id) on delete cascade,
  institute_name text not null,
  region text not null,
  condition_code text not null,
  title text not null,
  due_date text not null,
  evidence_document_ids text[] not null default '{}',
  submitted_at text,
  submitted_by text,
  verified_at text,
  verified_by text,
  rejection_reason text,
  status text not null default 'Pending',
  escalation_level integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id text primary key,
  rule text not null,
  entity_type text not null,
  entity_id text not null,
  tier text not null,
  severity text not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  status text not null default 'Open',
  title text not null,
  description text not null,
  link text,
  region text,
  institute_id text references public.institutes(id) on delete cascade,
  target_roles text[] not null default '{}'
);

create table if not exists public.escalations (
  id text primary key,
  application_id text,
  institute_name text,
  region text,
  raised_by text,
  raised_date text,
  urgency text not null default 'medium',
  reason text,
  status text not null default 'Open',
  level integer not null default 1,
  sla_breach_days integer not null default 0,
  dedupe_key text,
  entity_type text,
  entity_id text,
  acknowledged_by text,
  acknowledged_at text,
  resolved_at text,
  created_at timestamptz not null default now()
);

-- One row per authenticated user. The auth trigger below owns this table.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('SUPER_ADMIN','AICTE_ADMIN','REGIONAL_OFFICER','EVC_MEMBER','INSTITUTION_ADMIN')),
  region text,
  institute_id text references public.institutes(id) on delete set null,
  committee_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regional_scope_required check (role <> 'REGIONAL_OFFICER' or region is not null),
  constraint institution_scope_required check (role <> 'INSTITUTION_ADMIN' or institute_id is not null)
);

create table if not exists public.webhook_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check (status in ('Pending','Delivering','Delivered','Failed')),
  attempts integer not null default 0,
  idempotency_key text not null unique,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhook_outbox_pending_idx on public.webhook_outbox (status, next_attempt_at);

-- ------------------------------------------------------------------------------
-- 3. Scope helpers (security definer so policy evaluation never recurses)
-- ------------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql stable security definer set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.app_region()
returns text
language sql stable security definer set search_path = public
as $$
  select p.region from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.app_institute()
returns text
language sql stable security definer set search_path = public
as $$
  select p.institute_id from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.app_committee()
returns text
language sql stable security definer set search_path = public
as $$
  select p.committee_name from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.app_name()
returns text
language sql stable security definer set search_path = public
as $$
  select p.name from public.profiles p where p.id = auth.uid() and p.is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.app_role() in ('SUPER_ADMIN','AICTE_ADMIN'), false)
$$;

create or replace function public.is_evc_assigned_to(p_committee text, p_members text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from unnest(coalesce(p_members, '{}')) as member(name)
    where public.app_name() is not null and member.name ilike '%' || public.app_name() || '%'
  ) or (
    coalesce(public.app_committee(), '') <> ''
    and p_committee ilike '%' || public.app_committee() || '%'
  )
$$;

-- ------------------------------------------------------------------------------
-- 4. Profile provisioning from Supabase Auth
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'INSTITUTION_ADMIN');
begin
  if requested_role not in ('SUPER_ADMIN','AICTE_ADMIN','REGIONAL_OFFICER','EVC_MEMBER','INSTITUTION_ADMIN') then
    requested_role := 'INSTITUTION_ADMIN';
  end if;

  insert into public.profiles (id, name, email, role, region, institute_id, committee_name, phone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    requested_role,
    nullif(new.raw_user_meta_data->>'region', ''),
    nullif(new.raw_user_meta_data->>'institute_id', ''),
    nullif(new.raw_user_meta_data->>'committee_name', ''),
    nullif(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. Row level security
-- ------------------------------------------------------------------------------
alter table public.institutes enable row level security;
alter table public.applications enable row level security;
alter table public.evc_visits enable row level security;
alter table public.compliance_records enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.regional_offices enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_config enable row level security;
alter table public.undertakings enable row level security;
alter table public.alerts enable row level security;
alter table public.escalations enable row level security;
alter table public.profiles enable row level security;
alter table public.webhook_outbox enable row level security;

-- Remove the permissive hackathon policies wherever they exist.
do $$
declare
  target record;
begin
  for target in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like 'Public full access%'
  loop
    execute format('drop policy %I on %I.%I', target.policyname, target.schemaname, target.tablename);
  end loop;
end
$$;

-- Profiles: own row; admins all rows; regional officers read their region.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  );

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.app_role() = 'SUPER_ADMIN')
  with check (id = auth.uid() or public.app_role() = 'SUPER_ADMIN');

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.app_role() = 'SUPER_ADMIN');

-- Institutes.
drop policy if exists institutes_select on public.institutes;
create policy institutes_select on public.institutes
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() in ('REGIONAL_OFFICER','EVC_MEMBER') and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and id = public.app_institute())
  );

drop policy if exists institutes_write on public.institutes;
create policy institutes_write on public.institutes
  for all to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  );

-- Applications.
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
    or (
      public.app_role() = 'EVC_MEMBER'
      and region = public.app_region()
      and exists (
        select 1 from public.evc_visits v
        where v.application_id = applications.id
          and public.is_evc_assigned_to(v.assigned_committee, v.committee_members)
      )
    )
  );

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.app_role() = 'INSTITUTION_ADMIN'
      and institute_id = public.app_institute()
      and region = (select i.region from public.institutes i where i.id = applications.institute_id)
    )
  );

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute() and status not in ('Approved','Rejected'))
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute() and status not in ('Approved','Rejected'))
  );

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications
  for delete to authenticated
  using (public.app_role() = 'SUPER_ADMIN');

-- EVC visits.
drop policy if exists evc_visits_select on public.evc_visits;
create policy evc_visits_select on public.evc_visits
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
    or (
      public.app_role() = 'EVC_MEMBER'
      and region = public.app_region()
      and public.is_evc_assigned_to(assigned_committee, committee_members)
    )
  );

drop policy if exists evc_visits_insert on public.evc_visits;
create policy evc_visits_insert on public.evc_visits
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  );

drop policy if exists evc_visits_update on public.evc_visits;
create policy evc_visits_update on public.evc_visits
  for update to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (
      public.app_role() = 'EVC_MEMBER'
      and public.is_evc_assigned_to(assigned_committee, committee_members)
    )
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (
      public.app_role() = 'EVC_MEMBER'
      and public.is_evc_assigned_to(assigned_committee, committee_members)
    )
  );

drop policy if exists evc_visits_delete on public.evc_visits;
create policy evc_visits_delete on public.evc_visits
  for delete to authenticated
  using (public.app_role() = 'SUPER_ADMIN');

-- Compliance records.
drop policy if exists compliance_records_select on public.compliance_records;
create policy compliance_records_select on public.compliance_records
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() in ('REGIONAL_OFFICER','EVC_MEMBER') and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

drop policy if exists compliance_records_write on public.compliance_records;
create policy compliance_records_write on public.compliance_records
  for all to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

-- Documents.
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() in ('REGIONAL_OFFICER','EVC_MEMBER') and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents
  for all to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

-- Undertakings.
drop policy if exists undertakings_select on public.undertakings;
create policy undertakings_select on public.undertakings
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

drop policy if exists undertakings_write on public.undertakings;
create policy undertakings_write on public.undertakings
  for all to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

-- Alerts: clients may read and triage; only the service role inserts them.
drop policy if exists alerts_select on public.alerts;
create policy alerts_select on public.alerts
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() in ('REGIONAL_OFFICER','EVC_MEMBER') and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

drop policy if exists alerts_update on public.alerts;
create policy alerts_update on public.alerts
  for update to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  );

-- Escalations.
drop policy if exists escalations_select on public.escalations;
create policy escalations_select on public.escalations
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and application_id in (
      select a.id from public.applications a where a.institute_id = public.app_institute()
    ))
  );

drop policy if exists escalations_write on public.escalations;
create policy escalations_write on public.escalations
  for all to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and application_id in (
      select a.id from public.applications a where a.institute_id = public.app_institute()
    ))
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and application_id in (
      select a.id from public.applications a where a.institute_id = public.app_institute()
    ))
  );

-- Notifications: each user only sees notifications addressed to their scope.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (
    public.is_admin()
    or target_user_id = auth.uid()::text
    or (
      (target_role is null or target_role = public.app_role())
      and (target_region is null or target_region = public.app_region())
      and (target_institute_id is null or target_institute_id = public.app_institute())
    )
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (
    public.is_admin()
    or target_user_id = auth.uid()::text
    or (
      (target_role is null or target_role = public.app_role())
      and (target_region is null or target_region = public.app_region())
      and (target_institute_id is null or target_institute_id = public.app_institute())
    )
  )
  with check (
    public.is_admin()
    or target_user_id = auth.uid()::text
    or (
      (target_role is null or target_role = public.app_role())
      and (target_region is null or target_region = public.app_region())
      and (target_institute_id is null or target_institute_id = public.app_institute())
    )
  );

-- Regional offices and configuration.
drop policy if exists regional_offices_select on public.regional_offices;
create policy regional_offices_select on public.regional_offices
  for select to authenticated using (auth.uid() is not null);

drop policy if exists regional_offices_write on public.regional_offices;
create policy regional_offices_write on public.regional_offices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists system_config_select on public.system_config;
create policy system_config_select on public.system_config
  for select to authenticated using (auth.uid() is not null);

drop policy if exists system_config_write on public.system_config;
create policy system_config_write on public.system_config
  for all to authenticated
  using (public.app_role() = 'SUPER_ADMIN')
  with check (public.app_role() = 'SUPER_ADMIN');

-- Audit: every authenticated user may append their own actions; only admins read.
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (auth.uid()::text = user_id);

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Webhook outbox is server-only: no policies for anon or authenticated.

-- ------------------------------------------------------------------------------
-- 6. Decision, scope and verification guards
-- ------------------------------------------------------------------------------
create or replace function public.guard_profile_scope()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and public.app_role() <> 'SUPER_ADMIN' then
    if new.role is distinct from old.role
      or new.region is distinct from old.region
      or new.institute_id is distinct from old.institute_id
      or new.committee_name is distinct from old.committee_name
      or new.is_active is distinct from old.is_active then
      raise exception 'Only a super administrator may change a profile role or scope.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_scope_guard on public.profiles;
create trigger profiles_scope_guard
  before update on public.profiles
  for each row execute function public.guard_profile_scope();

create or replace function public.guard_application_decision()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.decision is distinct from old.decision and new.decision is not null and auth.uid() is not null then
    if public.app_role() not in ('SUPER_ADMIN','AICTE_ADMIN') then
      raise exception 'Approval or rejection requires the competent authority.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists applications_decision_guard on public.applications;
create trigger applications_decision_guard
  before update on public.applications
  for each row execute function public.guard_application_decision();

create or replace function public.guard_verification()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.verified_by is distinct from old.verified_by and new.verified_by is not null and auth.uid() is not null then
    if not (
      public.app_role() in ('SUPER_ADMIN','AICTE_ADMIN')
      or (public.app_role() = 'REGIONAL_OFFICER' and old.region = public.app_region())
    ) then
      raise exception 'Only the competent officer may record verification.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists documents_verification_guard on public.documents;
create trigger documents_verification_guard
  before update on public.documents
  for each row execute function public.guard_verification();

drop trigger if exists undertakings_verification_guard on public.undertakings;
create trigger undertakings_verification_guard
  before update on public.undertakings
  for each row execute function public.guard_verification();

drop trigger if exists compliance_verification_guard on public.compliance_records;
create trigger compliance_verification_guard
  before update on public.compliance_records
  for each row execute function public.guard_verification();

-- The audit trail is append-only for every role, including the service role.
create or replace function public.reject_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit records are append-only and cannot be changed.';
end
$$;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.reject_audit_mutation();

revoke update, delete, truncate on public.audit_logs from anon, authenticated;

-- ------------------------------------------------------------------------------
-- 7. Storage: private document bucket with per-institute folders
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'institute-documents',
  'institute-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists institute_documents_select on storage.objects;
create policy institute_documents_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'institute-documents'
    and (
      public.is_admin()
      or (public.app_role() = 'INSTITUTION_ADMIN' and (storage.foldername(name))[1] = public.app_institute())
      or (
        public.app_role() in ('REGIONAL_OFFICER','EVC_MEMBER')
        and (storage.foldername(name))[1] in (
          select i.id from public.institutes i where i.region = public.app_region()
        )
      )
    )
  );

drop policy if exists institute_documents_insert on storage.objects;
create policy institute_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'institute-documents'
    and (
      public.is_admin()
      or (public.app_role() = 'INSTITUTION_ADMIN' and (storage.foldername(name))[1] = public.app_institute())
      or (public.app_role() = 'EVC_MEMBER' and (storage.foldername(name))[1] ~ '^inspection-')
    )
  );

drop policy if exists institute_documents_update on storage.objects;
create policy institute_documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'institute-documents'
    and (
      public.is_admin()
      or (public.app_role() = 'INSTITUTION_ADMIN' and (storage.foldername(name))[1] = public.app_institute())
    )
  )
  with check (
    bucket_id = 'institute-documents'
    and (
      public.is_admin()
      or (public.app_role() = 'INSTITUTION_ADMIN' and (storage.foldername(name))[1] = public.app_institute())
    )
  );

drop policy if exists institute_documents_delete on storage.objects;
create policy institute_documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'institute-documents'
    and (
      public.is_admin()
      or (public.app_role() = 'INSTITUTION_ADMIN' and (storage.foldername(name))[1] = public.app_institute())
    )
  );
