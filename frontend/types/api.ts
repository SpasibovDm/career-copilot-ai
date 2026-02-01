export type DocumentStatus = "pending" | "processed" | "failed";
export type DocumentKind = "resume" | "cover_letter" | "other";
export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string | null;
  location?: string | null;
  desired_roles?: string[] | null;
  skills?: string[] | null;
  languages?: Record<string, string> | null;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface Document {
  id: string;
  kind: DocumentKind;
  s3_key: string;
  text_extracted?: string | null;
  extracted_json?: Record<string, unknown> | null;
  status: DocumentStatus;
  failure_reason?: string | null;
}

export interface Vacancy {
  id: string;
  source_id?: string | null;
  external_id?: string | null;
  title: string;
  company?: string | null;
  location?: string | null;
  remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  description?: string | null;
  source: "manual" | "csv" | "api" | "rss" | "html" | "csv_url";
  url?: string | null;
}

export interface Match {
  id: string;
  vacancy_id: string;
  score: number;
  explanation?: string | null;
  missing_skills?: string[] | null;
  matched_skills?: string[] | null;
  reasons?: string[] | null;
}

export interface MatchDetail extends Match {
  tokens?: string[] | null;
  skill_gap_plan?: { skill: string; link: string }[] | null;
}

export interface GeneratedPackage {
  id: string;
  vacancy_id: string;
  cv_text: string;
  cover_letter_text: string;
  hr_message_text: string;
  export_pdf_s3_key?: string | null;
}

export interface ExportPdfResponse {
  download_url: string;
}

export interface Application {
  id: string;
  vacancy_id: string;
  status: ApplicationStatus;
  notes?: string | null;
  interview_notes?: string | null;
  updated_at: string;
}

export interface ApplicationAttachment {
  id: string;
  application_id: string;
  document_id: string;
  created_at: string;
}

export interface StatsResponse {
  vacancies_count: number;
  matches_count: number;
  documents_count: number;
  documents_parsed_count: number;
  applications_by_status: Record<ApplicationStatus, number>;
  last_matching_run_at?: string | null;
  upcoming_reminders: number;
}

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  documents_count: number;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminQueue {
  count: number;
  job_ids: string[];
}

export interface AdminHealth {
  queue_size: number;
  workers: number;
  last_worker_heartbeat?: string | null;
}

export interface AdminMetrics {
  queue_size: number;
  last_scheduler_run_at?: string | null;
}

export type VacancySourceType = "rss" | "html" | "csv_url" | "manual";

export interface VacancySource {
  id: string;
  type: VacancySourceType;
  name: string;
  url?: string | null;
  config?: Record<string, unknown> | null;
  is_enabled: boolean;
  created_at: string;
}

export interface VacancyImportRun {
  id: string;
  source_id: string;
  started_at: string;
  finished_at?: string | null;
  inserted_count: number;
  updated_count: number;
  status: string;
  error?: string | null;
}

export type ReminderStatus = "pending" | "done" | "snoozed";

export interface Reminder {
  id: string;
  application_id: string;
  title: string;
  note?: string | null;
  due_at: string;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}

export type NotificationType = "matches" | "document_failed" | "reminder_due";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ShareLinkResponse {
  url: string;
  token: string;
  expires_at?: string | null;
}
