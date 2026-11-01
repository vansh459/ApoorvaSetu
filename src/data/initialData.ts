import {
  Application,
  ApplicationTimelineEvent,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  RegionalOffice,
  Undertaking
} from '../types';
import { formatDisplayDate, toIsoDate } from '../utils/dates';

const SEED_DAY_MS = 24 * 60 * 60 * 1000;
const seedToday = new Date();

function seedDate(offsetDays: number): string {
  return toIsoDate(new Date(seedToday.getTime() + offsetDays * SEED_DAY_MS));
}

function seedStamp(offsetDays: number): string {
  return new Date(seedToday.getTime() + offsetDays * SEED_DAY_MS).toISOString();
}

function seedDisplay(offsetDays: number): string {
  return formatDisplayDate(seedDate(offsetDays));
}

function seedDisplayParts(offsetDays: number): { day: string; month: string } {
  const [year, month, day] = seedDate(offsetDays).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleString('en-US', { month: 'short' })
  };
}

const completed = (
  stage: string,
  offsetDays: number,
  officer?: string,
  notes?: string
): ApplicationTimelineEvent => ({
  stage,
  date: seedDisplay(offsetDays),
  status: 'completed',
  officer,
  notes,
  enteredAt: seedDate(offsetDays)
});

const current = (
  stage: string,
  offsetDays: number,
  officer?: string,
  notes?: string
): ApplicationTimelineEvent => ({
  stage,
  date: seedDisplay(offsetDays),
  status: 'current',
  officer,
  notes,
  enteredAt: seedDate(offsetDays)
});

const pending = (stage: string): ApplicationTimelineEvent => ({
  stage,
  date: 'Pending',
  status: 'pending'
});

export const initialApplications: Application[] = [
  {
    id: 'AICTE/2026/12876',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    type: 'Extension of Approval (EoA)',
    region: 'Northern',
    state: 'Uttar Pradesh',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    stageEnteredAt: seedDate(-4),
    stageDueAt: seedDate(17),
    lastUpdated: seedDisplay(-1),
    appliedDate: seedDisplay(-50),
    category: 'Engineering & Technology',
    intakeProposed: 480,
    programs: ['Computer Science & Engg', 'Electronics & Comm', 'Mechanical Engg'],
    contactEmail: 'registrar@abctech.edu.in',
    contactPhone: '+91 98765 43210',
    remarks: `Physical EVC visit scheduled for ${seedDisplay(6)}. Committee constituted.`,
    evcVisitId: 'EVC-8805',
    documents: [
      { name: 'Fire Safety Certificate', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-45) },
      { name: 'Land Registration Deed', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-50) },
      { name: 'Faculty Cadre Ratio Declaration', type: 'PDF', status: 'Pending', uploadedOn: seedDisplay(-3) }
    ],
    timeline: [
      completed('Submitted', -50, 'Portal Auto-ack', 'Application fee paid and submitted.'),
      completed('Scrutiny / Re-scrutiny', -35, 'Dr. R. K. Sharma (RO)', 'Primary scrutiny cleared without deficiencies.'),
      current('Expert Visit Committee (EVC)', -4, 'Committee Head: Prof. S. Banerjee', 'Inspection scheduled for facility audit.'),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12875',
    instituteId: 'INST-102',
    instituteName: 'XYZ College of Engg.',
    type: 'New Technical Campus',
    region: 'Western',
    state: 'Maharashtra',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'In Progress',
    stageEnteredAt: seedDate(-26),
    stageDueAt: seedDate(4),
    lastUpdated: seedDisplay(-1),
    appliedDate: seedDisplay(-31),
    category: 'Engineering & Technology',
    intakeProposed: 360,
    programs: ['AI & Data Science', 'Information Tech', 'Civil Engg'],
    contactEmail: 'director@xyzengg.ac.in',
    contactPhone: '+91 98220 11223',
    remarks: 'Re-scrutiny requested for revised master plan and floor area calculations.',
    documents: [
      { name: 'Building Approval Plan', type: 'PDF', status: 'Pending', uploadedOn: seedDisplay(-28) },
      { name: 'Society Registration', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-31) }
    ],
    timeline: [
      completed('Submitted', -31, 'Portal Auto-ack', 'Initial submission'),
      current('Scrutiny / Re-scrutiny', -26, 'Er. A. Kulkarni (Western RO)', 'Clarification sought on land conversion certificate.'),
      pending('Expert Visit Committee (EVC)'),
      pending('SAC / SHC'),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12874',
    instituteId: 'INST-103',
    instituteName: 'Global Institute',
    type: 'New Technical Campus',
    region: 'Southern',
    state: 'Karnataka',
    stage: 'SAC / SHC',
    status: 'Pending',
    stageEnteredAt: seedDate(-21),
    stageDueAt: seedDate(0),
    lastUpdated: seedDisplay(-2),
    appliedDate: seedDisplay(-90),
    category: 'Management',
    intakeProposed: 180,
    programs: ['MBA General', 'MBA Business Analytics'],
    contactEmail: 'dean@globalmgmt.edu',
    contactPhone: '+91 97410 99887',
    remarks: `Standing Appellate Committee review set for hearing on ${seedDisplay(3)}.`,
    evcVisitId: 'EVC-8806',
    documents: [
      { name: 'Audited Financial Statements', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-88) },
      { name: 'Affiliation Letter - Bangalore Univ', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-85) }
    ],
    timeline: [
      completed('Submitted', -90, 'Portal Auto-ack'),
      completed('Scrutiny / Re-scrutiny', -70, 'Southern RO Committee'),
      completed('Expert Visit Committee (EVC)', -40, 'Prof. M. Swamy'),
      current('SAC / SHC', -21, 'SAC Bench-2', 'Review of student-teacher ratio deficiency response.'),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    type: 'Extension of Approval (EoA)',
    region: 'Eastern',
    state: 'West Bengal',
    stage: 'Approval (Subject to Undertaking)',
    status: 'Action Required',
    stageEnteredAt: seedDate(-18),
    stageDueAt: seedDate(-3),
    lastUpdated: seedDisplay(-1),
    appliedDate: seedDisplay(-75),
    category: 'Engineering & Technology',
    intakeProposed: 420,
    programs: ['Electrical Engg', 'Computer Science', 'Cyber Security'],
    contactEmail: 'admin@technoinst.org',
    contactPhone: '+91 93300 44556',
    remarks: 'Pending signed affidavit for ramp/barrier-free environment compliance before EoA release.',
    documents: [
      { name: 'Barrier-Free Environment Affidavit', type: 'PDF', status: 'Rejected', uploadedOn: seedDisplay(-10) },
      { name: 'Structural Safety Certificate', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-72) }
    ],
    timeline: [
      completed('Submitted', -75),
      completed('Scrutiny / Re-scrutiny', -60),
      completed('Expert Visit Committee (EVC)', -45),
      current('Approval (Subject to Undertaking)', -18, 'Approval Bureau', 'Action Required: Upload notarized affidavit on stamp paper.'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12872',
    instituteId: 'INST-105',
    instituteName: 'Sunrise College',
    type: 'Extension of Approval (EoA)',
    region: 'Central',
    state: 'Madhya Pradesh',
    stage: 'Final Approval',
    status: 'Approved',
    stageEnteredAt: seedDate(-20),
    stageDueAt: seedDate(-10),
    lastUpdated: seedDisplay(-10),
    appliedDate: seedDisplay(-85),
    category: 'Pharmacy',
    intakeProposed: 100,
    programs: ['B.Pharm', 'M.Pharm Pharmaceutics'],
    contactEmail: 'principal@sunrisecollege.ac.in',
    contactPhone: '+91 755 2776655',
    remarks: 'Approval Letter issued and sealed digitally.',
    evcVisitId: 'EVC-8803',
    decision: {
      outcome: 'Approved',
      code: 'APPROVED_FINAL',
      note: 'Approved for Academic Year 2026-27 after compliance verification.',
      by: 'Member Secretary, AICTE',
      at: seedDate(-10),
      competentAuthority: 'Member Secretary, AICTE'
    },
    lastActionBy: 'Member Secretary, AICTE',
    documents: [
      { name: 'PCI NOC Certificate', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-84) },
      { name: 'Lab Infrastructure Verification', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-50) }
    ],
    timeline: [
      completed('Submitted', -85),
      completed('Scrutiny / Re-scrutiny', -70),
      completed('Expert Visit Committee (EVC)', -55),
      completed('Approval (Subject to Undertaking)', -35),
      completed('Final Approval', -10, 'Member Secretary, AICTE', 'Approved for Academic Year 2026-27.')
    ]
  },
  {
    id: 'AICTE/2026/12871',
    instituteId: 'INST-106',
    instituteName: 'NIT Rourkela',
    type: 'Extension of Approval (EoA)',
    region: 'Eastern',
    state: 'Odisha',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    stageEnteredAt: seedDate(-14),
    stageDueAt: seedDate(7),
    lastUpdated: seedDisplay(-6),
    appliedDate: seedDisplay(-60),
    category: 'Engineering & Technology',
    intakeProposed: 60,
    programs: ['M.Tech Quantum Computing'],
    contactEmail: 'director@nitrkl.ac.in',
    contactPhone: '+91 661 2462001',
    remarks: `EVC visit completed on ${seedDisplay(-13)}; inspection report is overdue.`,
    evcVisitId: 'EVC-8801',
    documents: [
      { name: 'Senate Approval Minutes', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-60) }
    ],
    timeline: [
      completed('Submitted', -60),
      completed('Scrutiny / Re-scrutiny', -40),
      current('Expert Visit Committee (EVC)', -14, 'Committee East-A', `Visit conducted ${seedDisplay(-13)}; report pending.`),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12870',
    instituteId: 'INST-107',
    instituteName: 'IIIT Hyderabad',
    type: 'Extension of Approval',
    region: 'Southern',
    state: 'Telangana',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    stageEnteredAt: seedDate(-2),
    stageDueAt: seedDate(19),
    lastUpdated: seedDisplay(-1),
    appliedDate: seedDisplay(-35),
    category: 'Engineering & Technology',
    intakeProposed: 300,
    programs: ['B.Tech Computer Science', 'B.Tech ECE'],
    contactEmail: 'academics@iiit.ac.in',
    contactPhone: '+91 40 66531000',
    remarks: `Hybrid EVC committee inspection confirmed for ${seedDisplay(5)}.`,
    evcVisitId: 'EVC-8802',
    documents: [
      { name: 'Research Grant Audit', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-33) }
    ],
    timeline: [
      completed('Submitted', -35),
      completed('Scrutiny / Re-scrutiny', -20),
      current('Expert Visit Committee (EVC)', -2),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12869',
    instituteId: 'INST-108',
    instituteName: 'GGSIPU Delhi',
    type: 'Addition of Integrated Course',
    region: 'Northern',
    state: 'Delhi',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'Returned',
    stageEnteredAt: seedDate(-20),
    stageDueAt: seedDate(10),
    lastUpdated: seedDisplay(-3),
    appliedDate: seedDisplay(-32),
    category: 'Engineering & Technology',
    intakeProposed: 120,
    programs: ['Integrated B.Tech - M.Tech Biotech'],
    contactEmail: 'vc@ipu.ac.in',
    contactPhone: '+91 11 25302170',
    remarks: 'Returned for correction (DOC_MISSING): the state NOC copy is illegible.',
    deficiencies: [
      {
        code: 'DOC_MISSING',
        note: 'The State Government NOC uploaded on the portal is illegible. Upload a signed, self-attested copy.',
        stage: 'Scrutiny / Re-scrutiny',
        raisedAt: seedDate(-3),
        raisedBy: 'Dr. R. K. Sharma (RO)'
      }
    ],
    returns: [
      {
        fromStage: 'Scrutiny / Re-scrutiny',
        toStage: 'Scrutiny / Re-scrutiny',
        code: 'DOC_MISSING',
        note: 'The State Government NOC uploaded on the portal is illegible. Upload a signed, self-attested copy.',
        by: 'Dr. R. K. Sharma (RO)',
        at: seedDate(-3)
      }
    ],
    documents: [
      { name: 'State Govt NOC', type: 'PDF', status: 'Pending', uploadedOn: seedDisplay(-30) }
    ],
    timeline: [
      completed('Submitted', -32),
      current('Scrutiny / Re-scrutiny', -20, 'Dr. R. K. Sharma (RO)', 'Returned (DOC_MISSING): the state NOC copy is illegible.'),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12868',
    instituteId: 'INST-109',
    instituteName: 'VIT Vellore',
    type: 'Extension of Approval',
    region: 'Southern',
    state: 'Tamil Nadu',
    stage: 'Expert Visit Committee (EVC)',
    status: 'Pending',
    stageEnteredAt: seedDate(-5),
    stageDueAt: seedDate(16),
    lastUpdated: seedDisplay(-2),
    appliedDate: seedDisplay(-40),
    category: 'Engineering & Technology',
    intakeProposed: 1200,
    programs: ['B.Tech Software Engg', 'B.Tech Bio-medical'],
    contactEmail: 'registrar@vit.ac.in',
    contactPhone: '+91 416 2202020',
    remarks: `Committee constitution pending for the ${seedDisplay(9)} visit.`,
    evcVisitId: 'EVC-8804',
    documents: [
      { name: 'Campus Safety Audit', type: 'PDF', status: 'Verified', uploadedOn: seedDisplay(-38) }
    ],
    timeline: [
      completed('Submitted', -40),
      completed('Scrutiny / Re-scrutiny', -25),
      current('Expert Visit Committee (EVC)', -5),
      pending('Approval (Subject to Undertaking)'),
      pending('Final Approval')
    ]
  },
  {
    id: 'AICTE/2026/12867',
    instituteId: 'INST-110',
    instituteName: 'Apex School of Architecture',
    type: 'New Technical Campus',
    region: 'North Eastern',
    state: 'Assam',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'In Progress',
    stageEnteredAt: seedDate(-42),
    stageDueAt: seedDate(-12),
    lastUpdated: seedDisplay(-4),
    appliedDate: seedDisplay(-50),
    category: 'Architecture',
    intakeProposed: 80,
    programs: ['B.Arch', 'M.Arch Urban Design'],
    contactEmail: 'info@apexarch.edu.in',
    contactPhone: '+91 361 2459988',
    remarks: 'Council of Architecture (COA) synchronization under review; scrutiny deadline crossed.',
    documents: [
      { name: 'COA Concurrence Letter', type: 'PDF', status: 'Pending', uploadedOn: seedDisplay(-46) }
    ],
    timeline: [
      completed('Submitted', -50),
      current('Scrutiny / Re-scrutiny', -42, 'Dr. P. K. Goswami (RO)', 'COA concurrence still awaited; statutory scrutiny window crossed.')
    ]
  }
];

export const initialInstitutes: Institute[] = [
  {
    id: 'INST-101',
    code: '1-3329011',
    name: 'ABC Institute of Tech',
    region: 'Northern',
    state: 'Uttar Pradesh',
    city: 'Noida',
    category: 'Engineering & Technology',
    establishedYear: 2004,
    principalName: 'Dr. Anand Verma',
    email: 'registrar@abctech.edu.in',
    phone: '+91 98765 43210',
    address: 'Plot 4A, Knowledge Park II, Greater Noida, UP - 201306',
    status: 'Approved',
    approvedSeats: 480,
    accreditedPrograms: 3,
    complianceScore: 92,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-102',
    code: '1-4458922',
    name: 'XYZ College of Engg.',
    region: 'Western',
    state: 'Maharashtra',
    city: 'Pune',
    category: 'Engineering & Technology',
    establishedYear: 2012,
    principalName: 'Dr. Snehal Patil',
    email: 'director@xyzengg.ac.in',
    phone: '+91 98220 11223',
    address: 'Survey No. 45/2, Hinjewadi Phase 1, Pune, MH - 411057',
    status: 'Pending Review',
    approvedSeats: 360,
    accreditedPrograms: 2,
    complianceScore: 78,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-103',
    code: '1-8971233',
    name: 'Global Institute',
    region: 'Southern',
    state: 'Karnataka',
    city: 'Bengaluru',
    category: 'Management',
    establishedYear: 2008,
    principalName: 'Prof. Ramesh Rao',
    email: 'dean@globalmgmt.edu',
    phone: '+91 97410 99887',
    address: '14th Cross, Electronic City Phase 2, Bengaluru, KA - 560100',
    status: 'Approved',
    approvedSeats: 180,
    accreditedPrograms: 2,
    complianceScore: 88,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-104',
    code: '1-2109484',
    name: 'Techno Institute',
    region: 'Eastern',
    state: 'West Bengal',
    city: 'Kolkata',
    category: 'Engineering & Technology',
    establishedYear: 2001,
    principalName: 'Dr. Souvik Sen',
    email: 'admin@technoinst.org',
    phone: '+91 93300 44556',
    address: 'EM-4, Sector V, Salt Lake, Kolkata, WB - 700091',
    status: 'Notice Issued',
    approvedSeats: 420,
    accreditedPrograms: 4,
    complianceScore: 68,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-105',
    code: '1-7654129',
    name: 'Sunrise College',
    region: 'Central',
    state: 'Madhya Pradesh',
    city: 'Bhopal',
    category: 'Pharmacy',
    establishedYear: 2015,
    principalName: 'Dr. Meenakshi Soni',
    email: 'principal@sunrisecollege.ac.in',
    phone: '+91 755 2776655',
    address: 'Kolar Road, Near Mandakini Square, Bhopal, MP - 462042',
    status: 'Approved',
    approvedSeats: 100,
    accreditedPrograms: 1,
    complianceScore: 95,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-106',
    code: '1-1002938',
    name: 'NIT Rourkela',
    region: 'Eastern',
    state: 'Odisha',
    city: 'Rourkela',
    category: 'Engineering & Technology',
    establishedYear: 1961,
    principalName: 'Prof. Alok Mukherjee',
    email: 'director@nitrkl.ac.in',
    phone: '+91 661 2462001',
    address: 'Sector 1, Rourkela, Sundargarh, Odisha - 769008',
    status: 'Approved',
    approvedSeats: 1450,
    accreditedPrograms: 9,
    complianceScore: 98,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-107',
    code: '1-1098471',
    name: 'IIIT Hyderabad',
    region: 'Southern',
    state: 'Telangana',
    city: 'Hyderabad',
    category: 'Engineering & Technology',
    establishedYear: 1998,
    principalName: 'Prof. Harish Krishnan',
    email: 'academics@iiit.ac.in',
    phone: '+91 40 66531000',
    address: 'Gachibowli, Hyderabad, Telangana - 500032',
    status: 'Approved',
    approvedSeats: 300,
    accreditedPrograms: 4,
    complianceScore: 99,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-108',
    code: '1-3344556',
    name: 'GGSIPU',
    region: 'Northern',
    state: 'Delhi',
    city: 'New Delhi',
    category: 'Engineering & Technology',
    establishedYear: 1998,
    principalName: 'Prof. Devendra Joshi',
    email: 'vc@ipu.ac.in',
    phone: '+91 11 25302170',
    address: 'Sector 16C, Dwarka, New Delhi - 110078',
    status: 'Approved',
    approvedSeats: 850,
    accreditedPrograms: 6,
    complianceScore: 94,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-109',
    code: '1-9922110',
    name: 'VIT Vellore',
    region: 'Southern',
    state: 'Tamil Nadu',
    city: 'Vellore',
    category: 'Engineering & Technology',
    establishedYear: 1984,
    principalName: 'Dr. S. Sundararajan',
    email: 'registrar@vit.ac.in',
    phone: '+91 416 2202020',
    address: 'Katpadi, Vellore, Tamil Nadu - 632014',
    status: 'Approved',
    approvedSeats: 2400,
    accreditedPrograms: 11,
    complianceScore: 96,
    activeApplicationsCount: 1
  },
  {
    id: 'INST-110',
    code: '1-6677889',
    name: 'Apex School of Architecture',
    region: 'North Eastern',
    state: 'Assam',
    city: 'Guwahati',
    category: 'Architecture',
    establishedYear: 2018,
    principalName: 'Ar. Subir Barua',
    email: 'info@apexarch.edu.in',
    phone: '+91 361 2459988',
    address: 'Amingaon, North Guwahati, Assam - 781031',
    status: 'Pending Review',
    approvedSeats: 80,
    accreditedPrograms: 0,
    complianceScore: 82,
    activeApplicationsCount: 1
  }
];

export const initialEVCVisits: EVCVisit[] = [
  {
    id: 'EVC-8801',
    applicationId: 'AICTE/2026/12871',
    instituteId: 'INST-106',
    instituteName: 'NIT Rourkela',
    stateRegion: 'Odisha (Eastern Region)',
    region: 'Eastern',
    date: seedDate(-13),
    displayDate: seedDisplayParts(-13),
    status: 'Scheduled',
    assignedCommittee: 'Committee East-A (Prof. H. K. Dash, Prof. R. Misra)',
    committeeMembers: ['Prof. H. K. Dash (IIT Kharagpur)', 'Prof. R. Misra (Jadavpur Univ)', 'AICTE Observer: Shri P. Roy'],
    mode: 'Physical',
    scheduledAt: seedDate(-13),
    reportDueAt: seedDate(-6),
    reportSubmitted: false
  },
  {
    id: 'EVC-8802',
    applicationId: 'AICTE/2026/12870',
    instituteId: 'INST-107',
    instituteName: 'IIIT Hyderabad',
    stateRegion: 'Telangana (Southern Region)',
    region: 'Southern',
    date: seedDate(5),
    displayDate: seedDisplayParts(5),
    status: 'Scheduled',
    assignedCommittee: 'Committee South-C (Prof. K. Rajan, Dr. N. Murthy)',
    committeeMembers: ['Prof. K. Rajan (IIT Madras)', 'Dr. N. Murthy (NIT Warangal)', 'AICTE Observer: Smt. L. Reddy'],
    mode: 'Hybrid',
    scheduledAt: seedDate(5),
    reportDueAt: seedDate(12),
    reportSubmitted: false
  },
  {
    id: 'EVC-8803',
    applicationId: 'AICTE/2026/12872',
    instituteId: 'INST-105',
    instituteName: 'Sunrise College',
    stateRegion: 'Madhya Pradesh (Central Region)',
    region: 'Central',
    date: seedDate(-55),
    displayDate: seedDisplayParts(-55),
    status: 'Completed',
    assignedCommittee: 'Committee Central-A (Prof. R. Shukla, Dr. M. Tiwari)',
    committeeMembers: ['Prof. R. Shukla (MANIT Bhopal)', 'Dr. M. Tiwari (RGPV)', 'AICTE Observer: Shri S. Nair'],
    mode: 'Physical',
    scheduledAt: seedDate(-55),
    reportDueAt: seedDate(-48),
    reportSubmitted: true,
    reportSubmittedAt: seedDate(-50)
  },
  {
    id: 'EVC-8804',
    applicationId: 'AICTE/2026/12868',
    instituteId: 'INST-109',
    instituteName: 'VIT Vellore',
    stateRegion: 'Tamil Nadu (Southern Region)',
    region: 'Southern',
    date: seedDate(9),
    displayDate: seedDisplayParts(9),
    status: 'Pending',
    assignedCommittee: 'Panel Composition Pending',
    committeeMembers: ['Awaiting nomination from Southern Regional Committee'],
    mode: 'Physical',
    scheduledAt: seedDate(9),
    reportDueAt: seedDate(16),
    reportSubmitted: false
  },
  {
    id: 'EVC-8805',
    applicationId: 'AICTE/2026/12876',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    stateRegion: 'Uttar Pradesh (Northern Region)',
    region: 'Northern',
    date: seedDate(6),
    displayDate: seedDisplayParts(6),
    status: 'Scheduled',
    assignedCommittee: 'Committee North-D (Prof. S. Banerjee, Dr. O. P. Singh)',
    committeeMembers: ['Prof. S. Banerjee (IIT Roorkee)', 'Dr. O. P. Singh (KNIT Sultanpur)'],
    mode: 'Physical',
    scheduledAt: seedDate(6),
    reportDueAt: seedDate(13),
    reportSubmitted: false
  },
  {
    id: 'EVC-8806',
    applicationId: 'AICTE/2026/12874',
    instituteId: 'INST-103',
    instituteName: 'Global Institute',
    stateRegion: 'Karnataka (Southern Region)',
    region: 'Southern',
    date: seedDate(-40),
    displayDate: seedDisplayParts(-40),
    status: 'Completed',
    assignedCommittee: 'Committee South-B (Prof. M. Swamy, Dr. P. Bhat)',
    committeeMembers: ['Prof. M. Swamy (NIT Surathkal)', 'Dr. P. Bhat (VTU)', 'AICTE Observer: Smt. R. Menon'],
    mode: 'Hybrid',
    scheduledAt: seedDate(-40),
    reportDueAt: seedDate(-33),
    reportSubmitted: true,
    reportSubmittedAt: seedDate(-36)
  }
];

export const initialComplianceRecords: ComplianceRecord[] = [
  {
    id: 'CMP-101',
    title: 'Lease Documents (expiring < 3 months)',
    category: 'Lease Documents',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    status: 'Pending',
    dueDate: seedDate(7),
    urgency: 'high'
  },
  {
    id: 'CMP-102',
    title: 'Other Institutional Undertakings',
    category: 'Institutional Undertakings',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    status: 'Critical',
    dueDate: seedDate(-12),
    urgency: 'high'
  },
  {
    id: 'CMP-103',
    title: 'Compliance Submissions (pending)',
    category: 'Compliance Submissions',
    instituteName: 'XYZ College of Engg.',
    instituteId: 'INST-102',
    region: 'Western',
    status: 'Pending',
    dueDate: seedDate(11),
    urgency: 'medium'
  },
  {
    id: 'CMP-104',
    title: 'Documents Expired',
    category: 'Expired Documents',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    status: 'Expired',
    dueDate: seedDate(-45),
    urgency: 'high'
  },
  {
    id: 'CMP-105',
    title: 'Documents Valid',
    category: 'Valid Documents',
    instituteName: 'Sunrise College',
    instituteId: 'INST-105',
    region: 'Central',
    status: 'Verified',
    dueDate: seedDate(365),
    urgency: 'low'
  }
];

export const initialDocuments: DocumentItem[] = [
  {
    id: 'DOC-501',
    title: 'Registered Land Deed & Possession Certificate',
    category: 'Land & Building',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: seedDate(-500),
    expiryDate: seedDate(-45),
    status: 'Expired',
    fileSize: '4.2 MB',
    fileType: 'PDF',
    documentTypeCode: 'LAND_OWNERSHIP_DEED'
  },
  {
    id: 'DOC-502',
    title: 'Fire Safety NOC (Valid to 2028)',
    category: 'Fire Safety',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: seedDate(-400),
    expiryDate: seedDate(700),
    status: 'Verified',
    fileSize: '2.1 MB',
    fileType: 'PDF',
    documentTypeCode: 'FIRE_SAFETY_NOC',
    verifiedBy: 'Dr. R. K. Sharma (Northern RO)'
  },
  {
    id: 'DOC-503',
    title: 'Building Stability Certificate from Govt Structural Engineer',
    category: 'Land & Building',
    instituteName: 'XYZ College of Engg.',
    instituteId: 'INST-102',
    region: 'Western',
    uploadDate: seedDate(-300),
    expiryDate: seedDate(1600),
    status: 'Verified',
    fileSize: '5.8 MB',
    fileType: 'PDF',
    documentTypeCode: 'BUILDING_STABILITY',
    verifiedBy: 'Dr. A. K. Verma (Western RO)'
  },
  {
    id: 'DOC-504',
    title: 'State Government University Affiliation Extension',
    category: 'Affiliation',
    instituteName: 'Global Institute',
    instituteId: 'INST-103',
    region: 'Southern',
    uploadDate: seedDate(-200),
    expiryDate: seedDate(500),
    status: 'Verified',
    fileSize: '1.4 MB',
    fileType: 'PDF',
    documentTypeCode: 'UNIVERSITY_AFFILIATION',
    renewalStatus: 'Submitted',
    verifiedBy: 'Dr. K. R. Iyer (Southern RO)'
  },
  {
    id: 'DOC-505',
    title: 'Audited Balance Sheet & Financial Statements',
    category: 'Audit & Finance',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: seedDate(-90),
    expiryDate: seedDate(240),
    status: 'Verified',
    fileSize: '8.3 MB',
    fileType: 'PDF',
    documentTypeCode: 'AUDITED_FINANCIALS',
    verifiedBy: 'Dr. A. K. Verma (Eastern RO)'
  },
  {
    id: 'DOC-506',
    title: 'Barrier-Free Environment & Ramp Compliance Affidavit',
    category: 'AICTE Approvals',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: seedDate(-10),
    expiryDate: seedDate(45),
    status: 'Pending',
    fileSize: '1.9 MB',
    fileType: 'PDF',
    documentTypeCode: 'BARRIER_FREE_AFFIDAVIT'
  },
  {
    id: 'DOC-507',
    title: 'Registered Land Lease Deed (30-year tenure)',
    category: 'Land & Building',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: seedDate(-400),
    expiryDate: seedDate(7),
    status: 'Verified',
    fileSize: '6.1 MB',
    fileType: 'PDF',
    documentTypeCode: 'LAND_LEASE_DEED',
    verifiedBy: 'Dr. R. K. Sharma (Northern RO)'
  },
  {
    id: 'DOC-508',
    title: 'State Government University Affiliation Extension (renewal)',
    category: 'Affiliation',
    instituteName: 'Global Institute',
    instituteId: 'INST-103',
    region: 'Southern',
    uploadDate: seedDate(-3),
    expiryDate: seedDate(500),
    status: 'Pending',
    fileSize: '1.6 MB',
    fileType: 'PDF',
    documentTypeCode: 'UNIVERSITY_AFFILIATION',
    renewalOfId: 'DOC-504',
    renewalStatus: 'Submitted'
  },
  {
    id: 'DOC-509',
    title: 'Fire Safety NOC Renewal (2026-2033)',
    category: 'Fire Safety',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: seedDate(-30),
    expiryDate: seedDate(900),
    status: 'Verified',
    fileSize: '2.4 MB',
    fileType: 'PDF',
    documentTypeCode: 'FIRE_SAFETY_NOC',
    renewalOfId: 'DOC-510',
    renewalStatus: 'Verified',
    verifiedBy: 'Dr. A. K. Verma (Eastern RO)'
  },
  {
    id: 'DOC-510',
    title: 'Fire Safety NOC (2019-2024)',
    category: 'Fire Safety',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: seedDate(-1000),
    expiryDate: seedDate(-400),
    status: 'Superseded',
    fileSize: '1.7 MB',
    fileType: 'PDF',
    documentTypeCode: 'FIRE_SAFETY_NOC'
  }
];

export const initialUndertakings: Undertaking[] = [
  {
    id: 'UND-2601',
    applicationId: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    region: 'Eastern',
    conditionCode: 'UND_BARRIER_FREE',
    title: 'Barrier-free environment affidavit',
    dueDate: seedDate(-12),
    evidenceDocumentIds: [],
    status: 'Pending',
    escalationLevel: 0
  },
  {
    id: 'UND-2602',
    applicationId: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    region: 'Eastern',
    conditionCode: 'UND_FACULTY_RETENTION',
    title: 'Faculty retention undertaking',
    dueDate: seedDate(4),
    evidenceDocumentIds: ['Faculty_Retention_Bond_2026.pdf'],
    submittedAt: seedStamp(-2),
    submittedBy: 'Registrar, Techno Institute',
    status: 'Submitted',
    escalationLevel: 0
  },
  {
    id: 'UND-2603',
    applicationId: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    region: 'Eastern',
    conditionCode: 'UND_FIRE_NOC',
    title: 'Fire safety NOC renewal',
    dueDate: seedDate(27),
    evidenceDocumentIds: ['Fire_NOC_Renewal_2026.pdf'],
    submittedAt: seedStamp(-20),
    submittedBy: 'Registrar, Techno Institute',
    verifiedAt: seedStamp(-16),
    verifiedBy: 'Dr. A. K. Verma (Eastern RO)',
    status: 'Verified',
    escalationLevel: 0
  },
  {
    id: 'UND-2604',
    applicationId: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    region: 'Eastern',
    conditionCode: 'UND_FEE_REFUND',
    title: 'Fee refund policy affidavit',
    dueDate: seedDate(9),
    evidenceDocumentIds: ['Fee_Refund_Affidavit_draft.pdf'],
    submittedAt: seedStamp(-8),
    submittedBy: 'Registrar, Techno Institute',
    rejectionReason: 'Affidavit was not notarised and the refund timeline differs from the AICTE policy.',
    status: 'Rejected',
    escalationLevel: 0
  },
  {
    id: 'UND-2605',
    applicationId: 'AICTE/2026/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    region: 'Eastern',
    conditionCode: 'UND_LAB_AUGMENTATION',
    title: 'Laboratory augmentation plan',
    dueDate: seedDate(42),
    evidenceDocumentIds: [],
    status: 'Pending',
    escalationLevel: 0
  },
  {
    id: 'UND-2606',
    applicationId: 'AICTE/2026/12872',
    instituteId: 'INST-105',
    instituteName: 'Sunrise College',
    region: 'Central',
    conditionCode: 'UND_FACULTY_RETENTION',
    title: 'Faculty retention undertaking',
    dueDate: seedDate(-25),
    evidenceDocumentIds: ['Faculty_Retention_Bond_2026.pdf'],
    submittedAt: seedStamp(-30),
    submittedBy: 'Principal, Sunrise College',
    verifiedAt: seedStamp(-25),
    verifiedBy: 'Dr. Arvind Saxena (Central RO)',
    status: 'Verified',
    escalationLevel: 0
  },
  {
    id: 'UND-2607',
    applicationId: 'AICTE/2026/12872',
    instituteId: 'INST-105',
    instituteName: 'Sunrise College',
    region: 'Central',
    conditionCode: 'UND_FEE_REFUND',
    title: 'Fee refund policy affidavit',
    dueDate: seedDate(55),
    evidenceDocumentIds: [],
    status: 'Pending',
    escalationLevel: 0
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'NOTIF-1',
    title: 'EVC Report Overdue for NIT Rourkela',
    description: 'The inspection report from the East-A committee is past its filing deadline.',
    category: 'evc',
    timestamp: '10 mins ago',
    read: false,
    priority: 'high',
    link: '/evc-scheduling'
  },
  {
    id: 'NOTIF-2',
    title: 'Lease Documents Expiring Within 90 Days',
    description: 'Notice generated for institutions whose lease validity ends inside the warning window.',
    category: 'compliance',
    timestamp: '1 hour ago',
    read: false,
    priority: 'high',
    link: '/compliance'
  },
  {
    id: 'NOTIF-3',
    title: 'Techno Institute Undertaking Overdue',
    description: 'Barrier-free environment affidavit is past due. Awaiting resubmission.',
    category: 'application',
    timestamp: '3 hours ago',
    read: false,
    priority: 'medium',
    link: '/applications'
  },
  {
    id: 'NOTIF-4',
    title: 'Western Region Scrutiny Target 90% Completed',
    description: 'Scrutiny throughput for the current cycle is approaching the regional target.',
    category: 'system',
    timestamp: '1 day ago',
    read: true,
    priority: 'low',
    link: '/workflow'
  },
  {
    id: 'NOTIF-5',
    title: 'Annual EoA Letters Ready for Final Dispatch',
    description: 'Approved applications have cleared Final Approval and carry a recorded competent authority.',
    category: 'application',
    timestamp: '2 days ago',
    read: true,
    priority: 'low',
    link: '/reports'
  }
];

export const regionalOffices: RegionalOffice[] = [
  {
    id: 'RO-NORTH',
    region: 'Northern',
    headquarters: 'Kanpur / New Delhi',
    officerName: 'Dr. R. K. Sharma',
    designation: 'Regional Officer & Director',
    email: 'ro.north@aicte-india.org',
    phone: '+91 512 2585012',
    jurisdiction: ['Uttar Pradesh', 'Uttarakhand', 'Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh', 'Jammu & Kashmir', 'Ladakh'],
    totalInstitutes: 1640,
    pendingApplications: 520
  },
  {
    id: 'RO-SOUTH',
    region: 'Southern',
    headquarters: 'Chennai',
    officerName: 'Prof. K. Swaminathan',
    designation: 'Regional Officer',
    email: 'ro.south@aicte-india.org',
    phone: '+91 44 22350560',
    jurisdiction: ['Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Puducherry'],
    totalInstitutes: 1420,
    pendingApplications: 430
  },
  {
    id: 'RO-WEST',
    region: 'Western',
    headquarters: 'Mumbai',
    officerName: 'Dr. Anand Kulkarni',
    designation: 'Regional Officer',
    email: 'ro.west@aicte-india.org',
    phone: '+91 22 22855412',
    jurisdiction: ['Maharashtra', 'Gujarat', 'Goa', 'Daman & Diu'],
    totalInstitutes: 1180,
    pendingApplications: 380
  },
  {
    id: 'RO-EAST',
    region: 'Eastern',
    headquarters: 'Kolkata',
    officerName: 'Dr. Subhashish Roy',
    designation: 'Regional Officer',
    email: 'ro.east@aicte-india.org',
    phone: '+91 33 23357312',
    jurisdiction: ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Andaman & Nicobar'],
    totalInstitutes: 890,
    pendingApplications: 340
  },
  {
    id: 'RO-CENTRAL',
    region: 'Central',
    headquarters: 'Bhopal',
    officerName: 'Dr. Arvind Saxena',
    designation: 'Regional Officer',
    email: 'ro.central@aicte-india.org',
    phone: '+91 755 2660341',
    jurisdiction: ['Madhya Pradesh', 'Chhattisgarh', 'Rajasthan'],
    totalInstitutes: 720,
    pendingApplications: 260
  },
  {
    id: 'RO-NEAST',
    region: 'North Eastern',
    headquarters: 'Guwahati',
    officerName: 'Dr. P. K. Goswami',
    designation: 'Regional Officer',
    email: 'ro.ne@aicte-india.org',
    phone: '+91 361 2452210',
    jurisdiction: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh', 'Sikkim'],
    totalInstitutes: 210,
    pendingApplications: 95
  }
];

export const stageMovementData = [
  { name: 'Scrutiny / Re-scrutiny', count: 1482, percentage: 27, color: '#3b82f6', hex: '#3b82f6' },
  { name: 'Expert Visit Committee (EVC)', count: 1124, percentage: 21, color: '#8b5cf6', hex: '#8b5cf6' },
  { name: 'SAC / SHC', count: 896, percentage: 16, color: '#0d9488', hex: '#0d9488' },
  { name: 'Approval (Subject to Undertaking)', count: 642, percentage: 12, color: '#f59e0b', hex: '#f59e0b' },
  { name: 'Final Approval', count: 438, percentage: 8, color: '#10b981', hex: '#10b981' },
  { name: 'Other Stages', count: 476, percentage: 9, color: '#64748b', hex: '#64748b' }
];

export const regionalDistributionData = [
  { name: 'Northern', value: 1248, percentage: 23, color: '#3b82f6' },
  { name: 'Southern', value: 1102, percentage: 20, color: '#10b981' },
  { name: 'Eastern', value: 934, percentage: 17, color: '#f59e0b' },
  { name: 'Western', value: 872, percentage: 16, color: '#8b5cf6' },
  { name: 'Central', value: 648, percentage: 12, color: '#06b6d4' },
  { name: 'North Eastern', value: 391, percentage: 7, color: '#f43f5e' },
  { name: 'Others', value: 287, percentage: 5, color: '#334155' }
];

export const complianceSummaryData = [
  { label: 'Lease Documents (expiring < 3 months)', count: 126, color: '#ef4444', icon: 'file-text' },
  { label: 'Other Institutional Undertakings', count: 243, color: '#f59e0b', icon: 'file-text' },
  { label: 'Compliance Submissions (pending)', count: 389, color: '#3b82f6', icon: 'file-check' },
  { label: 'Documents Expired', count: 67, color: '#dc2626', icon: 'alert-circle' },
  { label: 'Documents Valid', count: 4957, color: '#10b981', icon: 'check-circle-2' }
];
