export type RequirementCategory =
  | "technical"
  | "financial"
  | "legal"
  | "administrative";

export type RequirementStatus = "not_started" | "in_progress" | "answered" | "reviewed";
export type TenderStatus = "identified" | "in_progress" | "submitted" | "won" | "lost";

export interface ExtractedRequirement {
  id: string;
  requirement_text: string;
  category: RequirementCategory;
  source_page: number | null;
  source_snippet: string;
  is_mandatory: boolean;
  evaluation_weight: number | null;
  keywords: string[];
  status?: RequirementStatus;
  draft?: { answer: string; content_gap: boolean } | null;
}

export interface ExtractionResult {
  document_title: string;
  issuing_body: string | null;
  submission_deadline: string | null;
  requirements: ExtractedRequirement[];
  mode?: "live" | "mock";
  tender_id?: string;
  status?: TenderStatus;
}

export interface ContentLibraryItem {
  id: string;
  title: string;
  body: string;
  category: RequirementCategory;
  tags: string[];
  created_at?: string;
}

export interface MatchedSource {
  content_id: string;
  title: string;
  similarity: number;
}

export interface DraftAnswer {
  requirement_id: string;
  answer: string;
  sources: MatchedSource[];
  content_gap: boolean;
  mode: "live" | "mock";
}

