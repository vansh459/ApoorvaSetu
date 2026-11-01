export type ReasonApplicability = 'RETURN' | 'REJECT' | 'BOTH';

export interface ReasonCode {
  code: string;
  label: string;
  description: string;
  applicableTo: ReasonApplicability;
  severity: 'low' | 'medium' | 'high';
}

export const REASON_CODES: ReasonCode[] = [
  { code: 'DOC_MISSING', label: 'Required document missing', description: 'A mandatory supporting document was not submitted.', applicableTo: 'BOTH', severity: 'medium' },
  { code: 'DOC_EXPIRED', label: 'Document expired', description: 'A submitted certificate has lapsed and must be renewed.', applicableTo: 'BOTH', severity: 'high' },
  { code: 'DOC_ILLEGIBLE', label: 'Document illegible', description: 'The uploaded scan is unreadable or incomplete.', applicableTo: 'RETURN', severity: 'low' },
  { code: 'FEE_PENDING', label: 'Fee not reconciled', description: 'The prescribed application fee is unpaid or unreconciled.', applicableTo: 'RETURN', severity: 'medium' },
  { code: 'LAND_DEFICIT', label: 'Land deficiency', description: 'Land area or ownership evidence does not meet APH norms.', applicableTo: 'BOTH', severity: 'high' },
  { code: 'FACULTY_DEFICIT', label: 'Faculty deficiency', description: 'Faculty cadre ratio or qualification falls short of norms.', applicableTo: 'BOTH', severity: 'high' },
  { code: 'FIRE_SAFETY', label: 'Fire safety non-compliance', description: 'Fire safety certificate is missing or invalid.', applicableTo: 'BOTH', severity: 'high' },
  { code: 'LAB_INFRA', label: 'Laboratory / infrastructure gap', description: 'Laboratory space or equipment is below the prescribed standard.', applicableTo: 'BOTH', severity: 'medium' },
  { code: 'PROGRAM_DEFICIENCY', label: 'Program deficiency', description: 'Program structure or intake details are inconsistent.', applicableTo: 'BOTH', severity: 'medium' },
  { code: 'UNDERTAKING_MISSING', label: 'Undertaking not furnished', description: 'A required time-bound undertaking or affidavit is missing.', applicableTo: 'BOTH', severity: 'high' },
  { code: 'EVC_ADVERSE', label: 'Adverse EVC findings', description: 'The Expert Visit Committee recorded adverse observations.', applicableTo: 'REJECT', severity: 'high' },
  { code: 'SAC_ADVERSE', label: 'Adverse SAC/SHC decision', description: 'The appellate committee did not recommend approval.', applicableTo: 'REJECT', severity: 'high' },
  { code: 'INELIGIBLE_INSTITUTE', label: 'Institution not eligible', description: 'The institution does not meet the eligibility conditions for this application.', applicableTo: 'REJECT', severity: 'high' },
  { code: 'DUPLICATE_APPLICATION', label: 'Duplicate application', description: 'A materially identical application is already under process.', applicableTo: 'REJECT', severity: 'medium' },
  { code: 'OTHER', label: 'Other recorded reason', description: 'A reason documented in the officer note.', applicableTo: 'BOTH', severity: 'medium' }
];

export function getReasonCode(code: string): ReasonCode | undefined {
  return REASON_CODES.find((reason) => reason.code === code);
}

export function reasonCodesFor(action: 'RETURN' | 'REJECT'): ReasonCode[] {
  return REASON_CODES.filter((reason) => reason.applicableTo === 'BOTH' || reason.applicableTo === action);
}

export const DECISION_CODES = [
  { code: 'APPROVED_FINAL', label: 'Approved, final' },
  { code: 'APPROVED_CONDITIONAL', label: 'Approved subject to undertaking' },
  { code: 'REJECTED_STATUTORY', label: 'Rejected on statutory grounds' },
  { code: 'REJECTED_INELIGIBLE', label: 'Rejected as ineligible' }
] as const;
