export type ObligationStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "done";

export type ObligationType =
  | "annual_report"
  | "tax_filing"
  | "audit"
  | "regulatory_disclosure"
  | "other";

export interface AuditEntry {
  from_status: string;
  to_status: string;
  changed_at: string;
}

export interface Obligation {
  id: string;
  type: ObligationType;
  title: string;
  description: string | null;
  status: ObligationStatus;
  due_date: string;
  owner: string;
  requires_document: boolean;
  document_url: string | null;
  company_tax_id: string;
  version: number;
  overdue: boolean;
  valid_transitions: ObligationStatus[];
  audit_trail: AuditEntry[];
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  error: string;
  detail: string;
  status: number;
}

export interface ObligationListResult {
  items: Obligation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ObligationStats {
  total: number;
  overdue: number;
  upcoming_7_days: number;
  by_status: Record<ObligationStatus, number>;
}
