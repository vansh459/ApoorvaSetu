-- ==============================================================================
-- APOORVASETU - AICTE APPROVAL WORKFLOW & COMPLIANCE SYSTEM
-- PostgreSQL Schema & Initial Seed Data for Supabase
-- Target Database: https://wnzbxgokbydjgnpkvucc.supabase.co
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. INSTITUTES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    established_year INTEGER NOT NULL,
    principal_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Approved',
    approved_seats INTEGER NOT NULL DEFAULT 0,
    accredited_programs INTEGER NOT NULL DEFAULT 0,
    compliance_score NUMERIC(5,2) NOT NULL DEFAULT 100.0,
    active_applications_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. APPLICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    institute_id TEXT NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    institute_name TEXT NOT NULL,
    type TEXT NOT NULL,
    region TEXT NOT NULL,
    state TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'Submitted',
    status TEXT NOT NULL DEFAULT 'In Progress',
    last_updated TEXT NOT NULL,
    applied_date TEXT NOT NULL,
    category TEXT NOT NULL,
    intake_proposed INTEGER NOT NULL DEFAULT 0,
    programs TEXT[] DEFAULT '{}',
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    remarks TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    timeline JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. EVC VISITS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evc_visits (
    id TEXT PRIMARY KEY,
    application_id TEXT,
    institute_id TEXT NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    institute_name TEXT NOT NULL,
    state_region TEXT NOT NULL,
    region TEXT NOT NULL,
    date DATE NOT NULL,
    display_date JSONB NOT NULL DEFAULT '{"day": "01", "month": "Jan"}'::jsonb,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    assigned_committee TEXT NOT NULL,
    committee_members TEXT[] DEFAULT '{}',
    mode TEXT NOT NULL DEFAULT 'Physical',
    report_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. COMPLIANCE RECORDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    institute_name TEXT NOT NULL,
    institute_id TEXT NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    due_date TEXT NOT NULL,
    submission_date TEXT,
    document_ref TEXT,
    urgency TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    institute_name TEXT NOT NULL,
    institute_id TEXT NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    region TEXT NOT NULL,
    upload_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    file_size TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'PDF',
    document_type_code TEXT,
    renewal_of_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    renewal_status TEXT,
    renewal_note TEXT,
    verified_by TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5b. AI-ASSISTED DOCUMENT VERIFICATION (advisory only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_verifications (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    institute_id TEXT NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
    institute_name TEXT NOT NULL,
    region TEXT NOT NULL,
    document_type_code TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL DEFAULT 0,
    file_hash TEXT NOT NULL,
    storage_path TEXT,
    extraction_method TEXT NOT NULL,
    extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_summary JSONB,
    disclaimer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Review'
        CHECK (status IN ('Pending Review', 'Accepted', 'Rejected')),
    decision JSONB,
    report JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 6. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    priority TEXT NOT NULL DEFAULT 'medium',
    link TEXT,
    target_role TEXT,
    target_region TEXT,
    target_institute_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. REGIONAL OFFICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regional_offices (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL UNIQUE,
    headquarters TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    jurisdiction TEXT[] DEFAULT '{}',
    total_institutes INTEGER NOT NULL DEFAULT 0,
    pending_applications INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. AUDIT LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT,
    previous_state TEXT,
    new_state TEXT,
    ip_address TEXT DEFAULT '127.0.0.1'
);

-- ------------------------------------------------------------------------------
-- 9. SYSTEM CONFIGURATION TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    approval_cycle_end_date TEXT NOT NULL DEFAULT '2026-04-30',
    evc_min_members INTEGER NOT NULL DEFAULT 3,
    auto_escalation_days INTEGER NOT NULL DEFAULT 7,
    notification_email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    require_two_factor_for_admin BOOLEAN NOT NULL DEFAULT TRUE,
    max_upload_size_mb INTEGER NOT NULL DEFAULT 25,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evc_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- SECURITY: this file only bootstraps tables and demo rows.
-- RLS is enabled above and no permissive policy is created, so anon and
-- authenticated requests are denied by default. Role-scoped policies, the
-- profiles/audit/webhook tables and the storage bucket live in
-- supabase/migrations/20261101090000_production_hardening.sql.
-- The offline demo never calls Supabase, so it does not need these policies.

-- ------------------------------------------------------------------------------
-- INITIAL SEED DATA
-- ------------------------------------------------------------------------------

-- 1. Institutes
INSERT INTO institutes (id, code, name, region, state, city, category, established_year, principal_name, email, phone, address, status, approved_seats, accredited_programs, compliance_score, active_applications_count)
VALUES
('INST-101', '1-10293847', 'ABC Institute of Tech', 'Northern', 'Uttar Pradesh', 'Noida', 'Engineering & Technology', 2004, 'Dr. K. S. Murthy', 'principal@abctech.edu.in', '+91 120 2400100', 'Plot 44, Knowledge Park III, Greater Noida, UP 201310', 'Approved', 660, 4, 94.5, 1),
('INST-102', '1-29384756', 'XYZ College of Engg.', 'Western', 'Maharashtra', 'Pune', 'Engineering & Technology', 2012, 'Dr. Sunita Deshmukh', 'director@xyzengg.ac.in', '+91 20 27456000', 'Survey No 12, Hinjewadi Phase 1, Pune, MH 411057', 'Approved', 420, 2, 88.0, 1),
('INST-103', '1-38475619', 'Global Institute of Mgmt', 'Southern', 'Karnataka', 'Bengaluru', 'Management', 2008, 'Dr. Philip George', 'dean@globalmgmt.edu', '+91 80 41238900', '88 Hosur Road, Electronic City, Bengaluru, KA 560100', 'Pending Review', 180, 1, 78.5, 1),
('INST-104', '1-47561928', 'Apex Tech University', 'Northern', 'Haryana', 'Gurugram', 'Engineering & Technology', 2016, 'Prof. Arvind Khurana', 'registrar@apexuniv.edu.in', '+91 124 4987100', 'Sector 56, Golf Course Road, Gurugram, HR 122011', 'Approved', 720, 3, 91.2, 1),
('INST-105', '1-56192837', 'National Pharmacy College', 'Eastern', 'West Bengal', 'Kolkata', 'Pharmacy', 2010, 'Dr. Debabrata Roy', 'info@natpharmacy.edu.in', '+91 33 24146000', 'Raja S.C. Mullick Road, Jadavpur, Kolkata, WB 700032', 'Approved', 120, 1, 96.0, 1)
ON CONFLICT (id) DO NOTHING;

-- 2. Applications
INSERT INTO applications (id, institute_id, institute_name, type, region, state, stage, status, last_updated, applied_date, category, intake_proposed, programs, contact_email, contact_phone, remarks, documents, timeline)
VALUES
(
  'AICTE/2025/12876',
  'INST-101',
  'ABC Institute of Tech',
  'Extension of Approval (EoA)',
  'Northern',
  'Uttar Pradesh',
  'Expert Visit Committee (EVC)',
  'In Progress',
  '21 Oct 2025',
  '12 Sep 2025',
  'Engineering & Technology',
  480,
  ARRAY['Computer Science & Engg', 'Electronics & Comm', 'Mechanical Engg'],
  'registrar@abctech.edu.in',
  '+91 98765 43210',
  'Physical EVC visit scheduled for 02 Nov 2025. Committee constituted.',
  '[
    {"name": "Fire Safety Certificate", "type": "PDF", "status": "Verified", "uploadedOn": "15 Sep 2025"},
    {"name": "Land Registration Deed", "type": "PDF", "status": "Verified", "uploadedOn": "12 Sep 2025"},
    {"name": "Faculty Cadre Ratio Declaration", "type": "PDF", "status": "Pending", "uploadedOn": "18 Sep 2025"}
  ]'::jsonb,
  '[
    {"stage": "Submitted", "date": "12 Sep 2025", "status": "completed", "officer": "Portal Auto-ack"},
    {"stage": "Scrutiny / Re-scrutiny", "date": "28 Sep 2025", "status": "completed", "officer": "Dr. R. K. Sharma (RO)"},
    {"stage": "Expert Visit Committee (EVC)", "date": "21 Oct 2025", "status": "current", "officer": "Committee Head: Prof. S. Banerjee"}
  ]'::jsonb
),
(
  'AICTE/2025/12875',
  'INST-102',
  'XYZ College of Engg.',
  'New Technical Campus',
  'Western',
  'Maharashtra',
  'Scrutiny / Re-scrutiny',
  'In Progress',
  '20 Oct 2025',
  '18 Sep 2025',
  'Engineering & Technology',
  360,
  ARRAY['AI & Data Science', 'Information Tech', 'Civil Engg'],
  'director@xyzengg.ac.in',
  '+91 98220 11223',
  'Re-scrutiny requested for revised master plan and floor area calculations.',
  '[
    {"name": "Building Approval Plan", "type": "PDF", "status": "Pending", "uploadedOn": "19 Sep 2025"},
    {"name": "Society Registration", "type": "PDF", "status": "Verified", "uploadedOn": "18 Sep 2025"}
  ]'::jsonb,
  '[
    {"stage": "Submitted", "date": "18 Sep 2025", "status": "completed", "officer": "Portal Auto-ack"},
    {"stage": "Scrutiny / Re-scrutiny", "date": "20 Oct 2025", "status": "current", "officer": "Er. A. Kulkarni (Western RO)"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. EVC Visits
INSERT INTO evc_visits (id, application_id, institute_id, institute_name, state_region, region, date, display_date, status, assigned_committee, committee_members, mode, report_submitted)
VALUES
('EVC-2025-081', 'AICTE/2025/12876', 'INST-101', 'ABC Institute of Tech', 'UP / Northern', 'Northern', '2025-11-02', '{"day": "02", "month": "Nov"}'::jsonb, 'Scheduled', 'Committee North-E4', ARRAY['Prof. S. Banerjee (IIT Delhi)', 'Dr. Neeta Verma (NIT UK)'], 'Physical', FALSE),
('EVC-2025-082', 'AICTE/2025/12875', 'INST-102', 'XYZ College of Engg.', 'MH / Western', 'Western', '2025-11-06', '{"day": "06", "month": "Nov"}'::jsonb, 'Scheduled', 'Committee West-B1', ARRAY['Dr. Vivek Patel (VJTI Mumbai)', 'Prof. Sneha Rao (COEP Pune)'], 'Physical', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 4. Regional Offices
INSERT INTO regional_offices (id, region, headquarters, officer_name, designation, email, phone, jurisdiction, total_institutes, pending_applications)
VALUES
('RO-NORTH', 'Northern', 'Kanpur, UP', 'Dr. R. K. Sharma', 'Regional Officer & Director', 'ro.north@aicte-india.org', '+91 512 2580011', ARRAY['Uttar Pradesh', 'Uttarakhand'], 1420, 64),
('RO-SOUTH', 'Southern', 'Chennai, TN', 'Dr. K. Balasubramanian', 'Regional Officer & Director', 'ro.south@aicte-india.org', '+91 44 22350100', ARRAY['Tamil Nadu', 'Puducherry'], 1880, 82),
('RO-WEST', 'Western', 'Mumbai, MH', 'Dr. Sanjay Deshmukh', 'Regional Officer & Director', 'ro.west@aicte-india.org', '+91 22 22851500', ARRAY['Maharashtra', 'Goa'], 1610, 71)
ON CONFLICT (id) DO NOTHING;

-- 5. System Config
INSERT INTO system_config (id, maintenance_mode, academic_year, approval_cycle_end_date, evc_min_members, auto_escalation_days)
VALUES ('default', FALSE, '2026-2027', '2026-04-30', 3, 7)
ON CONFLICT (id) DO NOTHING;

