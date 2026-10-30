import {
  Application,
  Institute,
  EVCVisit,
  ComplianceRecord,
  DocumentItem,
  NotificationItem,
  RegionalOffice
} from '../types';

export const initialApplications: Application[] = [
  {
    id: 'AICTE/2025/12876',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    type: 'Extension of Approval (EoA)',
    region: 'Northern',
    state: 'Uttar Pradesh',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    lastUpdated: '21 Oct 2025',
    appliedDate: '12 Sep 2025',
    category: 'Engineering & Technology',
    intakeProposed: 480,
    programs: ['Computer Science & Engg', 'Electronics & Comm', 'Mechanical Engg'],
    contactEmail: 'registrar@abctech.edu.in',
    contactPhone: '+91 98765 43210',
    remarks: 'Physical EVC visit scheduled for 02 Nov 2025. Committee constituted.',
    documents: [
      { name: 'Fire Safety Certificate', type: 'PDF', status: 'Verified', uploadedOn: '15 Sep 2025' },
      { name: 'Land Registration Deed', type: 'PDF', status: 'Verified', uploadedOn: '12 Sep 2025' },
      { name: 'Faculty Cadre Ratio Declaration', type: 'PDF', status: 'Pending', uploadedOn: '18 Sep 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '12 Sep 2025', status: 'completed', officer: 'Portal Auto-ack', notes: 'Application fee paid and submitted.' },
      { stage: 'Scrutiny / Re-scrutiny', date: '28 Sep 2025', status: 'completed', officer: 'Dr. R. K. Sharma (RO)', notes: 'Primary scrutiny cleared without deficiencies.' },
      { stage: 'Expert Visit Committee (EVC)', date: '21 Oct 2025', status: 'current', officer: 'Committee Head: Prof. S. Banerjee', notes: 'Inspection scheduled for facility audit.' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12875',
    instituteId: 'INST-102',
    instituteName: 'XYZ College of Engg.',
    type: 'New Technical Campus',
    region: 'Western',
    state: 'Maharashtra',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'In Progress',
    lastUpdated: '20 Oct 2025',
    appliedDate: '18 Sep 2025',
    category: 'Engineering & Technology',
    intakeProposed: 360,
    programs: ['AI & Data Science', 'Information Tech', 'Civil Engg'],
    contactEmail: 'director@xyzengg.ac.in',
    contactPhone: '+91 98220 11223',
    remarks: 'Re-scrutiny requested for revised master plan and floor area calculations.',
    documents: [
      { name: 'Building Approval Plan', type: 'PDF', status: 'Pending', uploadedOn: '19 Sep 2025' },
      { name: 'Society Registration', type: 'PDF', status: 'Verified', uploadedOn: '18 Sep 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '18 Sep 2025', status: 'completed', officer: 'Portal Auto-ack', notes: 'Initial submission' },
      { stage: 'Scrutiny / Re-scrutiny', date: '20 Oct 2025', status: 'current', officer: 'Er. A. Kulkarni (Western RO)', notes: 'Clarification sought on land conversion certificate.' },
      { stage: 'Expert Visit Committee (EVC)', date: 'Pending', status: 'pending' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12874',
    instituteId: 'INST-103',
    instituteName: 'Global Institute',
    type: 'Increase in Intake',
    region: 'Southern',
    state: 'Karnataka',
    stage: 'SAC / SHC',
    status: 'Pending',
    lastUpdated: '19 Oct 2025',
    appliedDate: '01 Sep 2025',
    category: 'Management',
    intakeProposed: 180,
    programs: ['MBA General', 'MBA Business Analytics'],
    contactEmail: 'dean@globalmgmt.edu',
    contactPhone: '+91 97410 99887',
    remarks: 'Standing Appellate Committee review set for hearing on 05 Nov 2025.',
    documents: [
      { name: 'Audited Financial Statements', type: 'PDF', status: 'Verified', uploadedOn: '02 Sep 2025' },
      { name: 'Affiliation Letter - Bangalore Univ', type: 'PDF', status: 'Verified', uploadedOn: '05 Sep 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '01 Sep 2025', status: 'completed', officer: 'Portal Auto-ack' },
      { stage: 'Scrutiny / Re-scrutiny', date: '15 Sep 2025', status: 'completed', officer: 'Southern RO Committee' },
      { stage: 'Expert Visit Committee (EVC)', date: '08 Oct 2025', status: 'completed', officer: 'Prof. M. Swamy' },
      { stage: 'SAC / SHC', date: '19 Oct 2025', status: 'current', officer: 'SAC Bench-2', notes: 'Review of student-teacher ratio deficiency response.' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12873',
    instituteId: 'INST-104',
    instituteName: 'Techno Institute',
    type: 'Extension of Approval (EoA)',
    region: 'Eastern',
    state: 'West Bengal',
    stage: 'Approval (Subject to Undertaking)',
    status: 'Action Required',
    lastUpdated: '18 Oct 2025',
    appliedDate: '25 Aug 2025',
    category: 'Engineering & Technology',
    intakeProposed: 420,
    programs: ['Electrical Engg', 'Computer Science', 'Cyber Security'],
    contactEmail: 'admin@technoinst.org',
    contactPhone: '+91 93300 44556',
    remarks: 'Pending signed affidavit for ramp/barrier-free environment compliance before EoA release.',
    documents: [
      { name: 'Barrier-Free Environment Affidavit', type: 'PDF', status: 'Rejected', uploadedOn: '10 Oct 2025' },
      { name: 'Structural Safety Certificate', type: 'PDF', status: 'Verified', uploadedOn: '28 Aug 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '25 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '10 Sep 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '30 Sep 2025', status: 'completed' },
      { stage: 'SAC / SHC', date: '12 Oct 2025', status: 'completed' },
      { stage: 'Approval (Subject to Undertaking)', date: '18 Oct 2025', status: 'current', officer: 'Approval Bureau', notes: 'Action Required: Upload notarized affidavit on stamp paper.' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12872',
    instituteId: 'INST-105',
    instituteName: 'Sunrise College',
    type: 'Extension of Approval (EoA)',
    region: 'Central',
    state: 'Madhya Pradesh',
    stage: 'Final Approval',
    status: 'Approved',
    lastUpdated: '17 Oct 2025',
    appliedDate: '15 Aug 2025',
    category: 'Pharmacy',
    intakeProposed: 100,
    programs: ['B.Pharm', 'M.Pharm Pharmaceutics'],
    contactEmail: 'principal@sunrisecollege.ac.in',
    contactPhone: '+91 755 2776655',
    remarks: 'Approval Letter AICTE/ERO/2025/EOA-0994 issued and sealed digitally.',
    documents: [
      { name: 'PCI NOC Certificate', type: 'PDF', status: 'Verified', uploadedOn: '16 Aug 2025' },
      { name: 'Lab Infrastructure Verification', type: 'PDF', status: 'Verified', uploadedOn: '22 Sep 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '15 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '02 Sep 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '22 Sep 2025', status: 'completed' },
      { stage: 'SAC / SHC', date: '05 Oct 2025', status: 'completed' },
      { stage: 'Approval (Subject to Undertaking)', date: '12 Oct 2025', status: 'completed' },
      { stage: 'Final Approval', date: '17 Oct 2025', status: 'completed', officer: 'Member Secretary, AICTE', notes: 'Approved for Academic Year 2026-27.' }
    ]
  },
  {
    id: 'AICTE/2025/12871',
    instituteId: 'INST-106',
    instituteName: 'NIT Rourkela',
    type: 'New Course Introduction',
    region: 'Eastern',
    state: 'Odisha',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    lastUpdated: '16 Oct 2025',
    appliedDate: '20 Aug 2025',
    category: 'Engineering & Technology',
    intakeProposed: 60,
    programs: ['M.Tech Quantum Computing'],
    contactEmail: 'director@nitrkl.ac.in',
    contactPhone: '+91 661 2462001',
    remarks: 'EVC Visit confirmed for 24 Oct 2025.',
    documents: [
      { name: 'Senate Approval Minutes', type: 'PDF', status: 'Verified', uploadedOn: '20 Aug 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '20 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '10 Sep 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '16 Oct 2025', status: 'current', notes: 'Visit date 24 Oct 2025' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12870',
    instituteId: 'INST-107',
    instituteName: 'IIIT Hyderabad',
    type: 'Extension of Approval',
    region: 'Southern',
    state: 'Telangana',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    lastUpdated: '15 Oct 2025',
    appliedDate: '10 Aug 2025',
    category: 'Engineering & Technology',
    intakeProposed: 300,
    programs: ['B.Tech Computer Science', 'B.Tech ECE'],
    contactEmail: 'academics@iiit.ac.in',
    contactPhone: '+91 40 66531000',
    remarks: 'Hybrid EVC committee inspection confirmed for 28 Oct 2025.',
    documents: [
      { name: 'Research Grant Audit', type: 'PDF', status: 'Verified', uploadedOn: '12 Aug 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '10 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '01 Sep 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '15 Oct 2025', status: 'current' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12869',
    instituteId: 'INST-108',
    instituteName: 'GGSIPU Delhi',
    type: 'Addition of Integrated Course',
    region: 'Northern',
    state: 'Delhi',
    stage: 'Expert Visit Committee (EVC)',
    status: 'In Progress',
    lastUpdated: '14 Oct 2025',
    appliedDate: '05 Aug 2025',
    category: 'Engineering & Technology',
    intakeProposed: 120,
    programs: ['Integrated B.Tech - M.Tech Biotech'],
    contactEmail: 'vc@ipu.ac.in',
    contactPhone: '+91 11 25302170',
    remarks: 'EVC Visit set for 02 Nov 2025 at Dwarka Campus.',
    documents: [
      { name: 'State Govt NOC', type: 'PDF', status: 'Verified', uploadedOn: '06 Aug 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '05 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '25 Aug 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '14 Oct 2025', status: 'current' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12868',
    instituteId: 'INST-109',
    instituteName: 'VIT Vellore',
    type: 'Extension of Approval',
    region: 'Southern',
    state: 'Tamil Nadu',
    stage: 'Expert Visit Committee (EVC)',
    status: 'Pending',
    lastUpdated: '13 Oct 2025',
    appliedDate: '01 Aug 2025',
    category: 'Engineering & Technology',
    intakeProposed: 1200,
    programs: ['B.Tech Software Engg', 'B.Tech Bio-medical'],
    contactEmail: 'registrar@vit.ac.in',
    contactPhone: '+91 416 2202020',
    remarks: 'Committee constitution pending for 07 Nov 2025 visit.',
    documents: [
      { name: 'Campus Safety Audit', type: 'PDF', status: 'Verified', uploadedOn: '04 Aug 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '01 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '20 Aug 2025', status: 'completed' },
      { stage: 'Expert Visit Committee (EVC)', date: '13 Oct 2025', status: 'current' },
      { stage: 'SAC / SHC', date: 'Pending', status: 'pending' },
      { stage: 'Approval (Subject to Undertaking)', date: 'Pending', status: 'pending' },
      { stage: 'Final Approval', date: 'Pending', status: 'pending' }
    ]
  },
  {
    id: 'AICTE/2025/12867',
    instituteId: 'INST-110',
    instituteName: 'Apex School of Architecture',
    type: 'New Technical Campus',
    region: 'North Eastern',
    state: 'Assam',
    stage: 'Scrutiny / Re-scrutiny',
    status: 'In Progress',
    lastUpdated: '11 Oct 2025',
    appliedDate: '28 Aug 2025',
    category: 'Architecture',
    intakeProposed: 80,
    programs: ['B.Arch', 'M.Arch Urban Design'],
    contactEmail: 'info@apexarch.edu.in',
    contactPhone: '+91 361 2459988',
    remarks: 'Council of Architecture (COA) synchronization under review.',
    documents: [
      { name: 'COA Concurrence Letter', type: 'PDF', status: 'Pending', uploadedOn: '01 Sep 2025' }
    ],
    timeline: [
      { stage: 'Submitted', date: '28 Aug 2025', status: 'completed' },
      { stage: 'Scrutiny / Re-scrutiny', date: '11 Oct 2025', status: 'current' }
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
    applicationId: 'AICTE/2025/12871',
    instituteId: 'INST-106',
    instituteName: 'NIT Rourkela',
    stateRegion: 'Odisha (Eastern Region)',
    region: 'Eastern',
    date: '2025-10-24',
    displayDate: { day: '24', month: 'Oct' },
    status: 'Scheduled',
    assignedCommittee: 'Committee East-A (Prof. H. K. Dash, Prof. R. Misra)',
    committeeMembers: ['Prof. H. K. Dash (IIT Kharagpur)', 'Prof. R. Misra (Jadavpur Univ)', 'AICTE Observer: Shri P. Roy'],
    mode: 'Physical',
    reportSubmitted: false
  },
  {
    id: 'EVC-8802',
    applicationId: 'AICTE/2025/12870',
    instituteId: 'INST-107',
    instituteName: 'IIIT Hyderabad',
    stateRegion: 'Telangana (Southern Region)',
    region: 'Southern',
    date: '2025-10-28',
    displayDate: { day: '28', month: 'Oct' },
    status: 'Scheduled',
    assignedCommittee: 'Committee South-C (Prof. K. Rajan, Dr. N. Murthy)',
    committeeMembers: ['Prof. K. Rajan (IIT Madras)', 'Dr. N. Murthy (NIT Warangal)', 'AICTE Observer: Smt. L. Reddy'],
    mode: 'Hybrid',
    reportSubmitted: false
  },
  {
    id: 'EVC-8803',
    applicationId: 'AICTE/2025/12869',
    instituteId: 'INST-108',
    instituteName: 'GGSIPU',
    stateRegion: 'Delhi (Northern Region)',
    region: 'Northern',
    date: '2025-11-02',
    displayDate: { day: '02', month: 'Nov' },
    status: 'Scheduled',
    assignedCommittee: 'Committee North-B (Prof. A. K. Jain, Prof. V. K. Aggarwal)',
    committeeMembers: ['Prof. A. K. Jain (DTU)', 'Prof. V. K. Aggarwal (IIT Delhi)', 'AICTE Observer: Shri R. K. Mathur'],
    mode: 'Physical',
    reportSubmitted: false
  },
  {
    id: 'EVC-8804',
    applicationId: 'AICTE/2025/12868',
    instituteId: 'INST-109',
    instituteName: 'VIT Vellore',
    stateRegion: 'Tamil Nadu (Southern Region)',
    region: 'Southern',
    date: '2025-11-07',
    displayDate: { day: '07', month: 'Nov' },
    status: 'Pending',
    assignedCommittee: 'Panel Composition Pending',
    committeeMembers: ['Awaiting nomination from Southern Regional Committee'],
    mode: 'Physical',
    reportSubmitted: false
  },
  {
    id: 'EVC-8805',
    applicationId: 'AICTE/2025/12876',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    stateRegion: 'Uttar Pradesh (Northern Region)',
    region: 'Northern',
    date: '2025-11-12',
    displayDate: { day: '12', month: 'Nov' },
    status: 'Scheduled',
    assignedCommittee: 'Committee North-D (Prof. S. Banerjee, Dr. O. P. Singh)',
    committeeMembers: ['Prof. S. Banerjee (IIT Roorkee)', 'Dr. O. P. Singh (KNIT Sultanpur)'],
    mode: 'Physical',
    reportSubmitted: false
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
    dueDate: '2025-11-30',
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
    dueDate: '2025-10-31',
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
    dueDate: '2025-11-15',
    urgency: 'medium'
  },
  {
    id: 'CMP-104',
    title: 'Documents Expired',
    category: 'Expired Documents',
    instituteName: 'Shri Ram Polytechnic',
    instituteId: 'INST-111',
    region: 'Central',
    status: 'Expired',
    dueDate: '2025-10-01',
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
    dueDate: '2026-10-15',
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
    uploadDate: '12 Sep 2025',
    expiryDate: '15 Dec 2025',
    status: 'Pending',
    fileSize: '4.2 MB',
    fileType: 'PDF'
  },
  {
    id: 'DOC-502',
    title: 'Fire Safety NOC (Valid 2025-2028)',
    category: 'Fire Safety',
    instituteName: 'ABC Institute of Tech',
    instituteId: 'INST-101',
    region: 'Northern',
    uploadDate: '15 Sep 2025',
    expiryDate: '14 Sep 2028',
    status: 'Verified',
    fileSize: '2.1 MB',
    fileType: 'PDF'
  },
  {
    id: 'DOC-503',
    title: 'Building Stability Certificate from Govt Structural Engineer',
    category: 'Land & Building',
    instituteName: 'XYZ College of Engg.',
    instituteId: 'INST-102',
    region: 'Western',
    uploadDate: '19 Sep 2025',
    expiryDate: '19 Sep 2030',
    status: 'Verified',
    fileSize: '5.8 MB',
    fileType: 'PDF'
  },
  {
    id: 'DOC-504',
    title: 'State Government University Affiliation Extension',
    category: 'Affiliation',
    instituteName: 'Global Institute',
    instituteId: 'INST-103',
    region: 'Southern',
    uploadDate: '05 Sep 2025',
    expiryDate: '30 Jun 2026',
    status: 'Verified',
    fileSize: '1.4 MB',
    fileType: 'PDF'
  },
  {
    id: 'DOC-505',
    title: 'Audited Balance Sheet & Financial Statements AY 2024-25',
    category: 'Audit & Finance',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: '28 Aug 2025',
    expiryDate: '31 Mar 2026',
    status: 'Verified',
    fileSize: '8.3 MB',
    fileType: 'PDF'
  },
  {
    id: 'DOC-506',
    title: 'Barrier-Free Environment & Ramp Compliance Affidavit',
    category: 'AICTE Approvals',
    instituteName: 'Techno Institute',
    instituteId: 'INST-104',
    region: 'Eastern',
    uploadDate: '10 Oct 2025',
    expiryDate: '10 Oct 2026',
    status: 'Pending',
    fileSize: '1.9 MB',
    fileType: 'PDF'
  }
];

export const initialNotifications: NotificationItem[] = [
  {
    id: 'NOTIF-1',
    title: 'EVC Visit Scheduled for NIT Rourkela',
    description: 'Expert Visit Committee East-A has been confirmed for 24 Oct 2025.',
    category: 'evc',
    timestamp: '10 mins ago',
    read: false,
    priority: 'high',
    link: '/evc-scheduling'
  },
  {
    id: 'NOTIF-2',
    title: 'Urgent: 126 Lease Documents Expiring',
    description: 'Notice generated for institutions with lease validity ending within 90 days.',
    category: 'compliance',
    timestamp: '1 hour ago',
    read: false,
    priority: 'high',
    link: '/compliance'
  },
  {
    id: 'NOTIF-3',
    title: 'Techno Institute Undertaking Overdue',
    description: 'Barrier-free environment affidavit returned with remarks. Awaiting resubmission.',
    category: 'application',
    timestamp: '3 hours ago',
    read: false,
    priority: 'medium',
    link: '/applications'
  },
  {
    id: 'NOTIF-4',
    title: 'Western Region Scrutiny Target 90% Completed',
    description: '1,482 applications processed through Stage 2 scrutiny this cycle.',
    category: 'system',
    timestamp: '1 day ago',
    read: true,
    priority: 'low',
    link: '/workflow'
  },
  {
    id: 'NOTIF-5',
    title: 'Annual EoA Letters Ready for Final Dispatch',
    description: '438 applications have cleared Final Approval stage and digital signs appended.',
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
