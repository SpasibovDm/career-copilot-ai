export type DocumentStatus = "pending" | "processed" | "failed";
export type DocumentKind = "resume" | "cover_letter" | "other";
export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export interface Profile {
  id: string;
  user_id: string;
  full_name?: string | null;
  location?: string | null;
  desired_roles?: string[] | null;
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
  title: string;
  location?: string | null;
  remote: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  description?: string | null;
  source: "manual" | "csv" | "api";
  url?: string | null;
}

export interface Match {
  id: string;
  vacancy_id: string;
  score: number;
  explanation?: string | null;
  missing_skills?: string[] | null;
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
  updated_at: string;
}

export interface StatsResponse {
  vacancies_count: number;
  matches_count: number;
  documents_count: number;
  documents_parsed_count: number;
  applications_by_status: Record<ApplicationStatus, number>;
  last_matching_run_at?: string | null;
}
