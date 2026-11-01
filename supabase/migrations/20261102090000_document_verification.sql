-- ------------------------------------------------------------------------------
-- AI-assisted document verification.
--
-- This module stores advisory findings only. It never updates applications,
-- approval decisions, or document verification status. An officer must review
-- every report, and final statutory decisions stay in the existing workflow.
-- ------------------------------------------------------------------------------

create table if not exists public.document_verifications (
  id text primary key,
  application_id text not null references public.applications(id) on delete cascade,
  document_id text references public.documents(id) on delete set null,
  institute_id text not null references public.institutes(id) on delete cascade,
  institute_name text not null,
  region text not null,
  document_type_code text not null,
  file_name text not null,
  file_type text not null default 'application/pdf',
  file_size bigint not null default 0,
  file_hash text not null,
  storage_path text,
  extraction_method text not null,
  extracted_fields jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  ai_summary jsonb,
  disclaimer text not null,
  status text not null default 'Pending Review'
    check (status in ('Pending Review', 'Accepted', 'Rejected')),
  decision jsonb,
  report jsonb not null,
  created_by text not null,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_by_name text,
  reviewed_at timestamptz
);

create index if not exists document_verifications_application_idx
  on public.document_verifications (application_id);

create index if not exists document_verifications_institute_idx
  on public.document_verifications (institute_id);

create index if not exists document_verifications_region_idx
  on public.document_verifications (region);

create index if not exists document_verifications_status_idx
  on public.document_verifications (status, created_at desc);

alter table public.document_verifications enable row level security;

drop policy if exists document_verifications_select on public.document_verifications;
create policy document_verifications_select on public.document_verifications
  for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (public.app_role() = 'INSTITUTION_ADMIN' and institute_id = public.app_institute())
  );

drop policy if exists document_verifications_insert on public.document_verifications;
create policy document_verifications_insert on public.document_verifications
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
    or (
      public.app_role() = 'INSTITUTION_ADMIN'
      and institute_id = public.app_institute()
      and status = 'Pending Review'
      and created_by_user_id = auth.uid()::text
    )
  );

-- Only reviewing officers may accept or reject findings. Institutions cannot
-- amend a submitted report.
drop policy if exists document_verifications_update on public.document_verifications;
create policy document_verifications_update on public.document_verifications
  for update to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  )
  with check (
    public.is_admin()
    or (public.app_role() = 'REGIONAL_OFFICER' and region = public.app_region())
  );

drop policy if exists document_verifications_delete on public.document_verifications;
create policy document_verifications_delete on public.document_verifications
  for delete to authenticated
  using (public.is_admin());
