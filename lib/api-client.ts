import type {
  ContentLibraryItem,
  DraftAnswer,
  ExtractedRequirement,
  ExtractionResult,
  RequirementStatus,
  TenderStatus,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request to ${url} failed.`);
  return data as T;
}

export interface AuthUser {
  email: string;
  role: string;
  orgId: string;
  fullName?: string | null;
}

export interface LibraryItemInput {
  title: string;
  body: string;
  category: string;
  tags: string[];
}

export const api = {
  me: () => jsonFetch<{ user: AuthUser | null }>("/api/auth/me"),

  signup: (input: { email: string; password: string; fullName?: string; orgName?: string }) =>
    jsonFetch<{ user: AuthUser; orgId: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    jsonFetch<{ mfa_required: boolean; user?: AuthUser; orgId?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    ),

  verifyMfa: (code: string) =>
    jsonFetch<{ mfa_required: false; user: AuthUser; orgId: string }>(
      "/api/auth/mfa/verify",
      { method: "POST", body: JSON.stringify({ code }) }
    ),

  mfaStatus: () =>
    jsonFetch<{ configured: boolean; enabled: boolean }>("/api/auth/mfa/status"),

  mfaSetup: () =>
    jsonFetch<{ enabled: boolean; secret?: string; otpauth_url?: string }>(
      "/api/auth/mfa/setup",
      { method: "POST" }
    ),

  mfaEnable: (code: string) =>
    jsonFetch<{ enabled: boolean }>("/api/auth/mfa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  mfaDisable: (code: string) =>
    jsonFetch<{ enabled: boolean }>("/api/auth/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  authConfig: () =>
    jsonFetch<{
      google_oauth: boolean;
      google_oauth_missing?: string[];
      oauth_redirect_uri?: string;
    }>("/api/auth/config"),

  logout: () => jsonFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  extractText: (text: string) =>
    jsonFetch<ExtractionResult>("/api/extract", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  extractFile: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/extract", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Extraction failed.");
    return data as ExtractionResult;
  },

  generateDraft: (requirement: ExtractedRequirement) =>
    jsonFetch<DraftAnswer>("/api/draft", {
      method: "POST",
      body: JSON.stringify(requirement),
    }),

  listTenders: () =>
    jsonFetch<{
      tenders: {
        id: string;
        title: string;
        issuing_body: string | null;
        submission_deadline: string | null;
        status: string;
        created_at: string;
        requirement_count: number;
      }[];
    }>("/api/tenders"),

  getTender: (id: string) => jsonFetch<ExtractionResult>(`/api/tenders/${id}`),

  updateTenderStatus: (id: string, status: TenderStatus) =>
    jsonFetch<{ id: string; status: TenderStatus }>(`/api/tenders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteTender: (id: string) =>
    jsonFetch<{ id: string }>(`/api/tenders/${id}`, { method: "DELETE" }),

  updateRequirementStatus: (id: string, status: RequirementStatus) =>
    jsonFetch<{ id: string; status: RequirementStatus }>(`/api/requirements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  listLibrary: () =>
    jsonFetch<{ items: ContentLibraryItem[] }>("/api/library"),

  addLibraryItem: (input: LibraryItemInput) =>
    jsonFetch<{ id: string }>("/api/library", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateLibraryItem: (id: string, input: Partial<LibraryItemInput>) =>
    jsonFetch<{ id: string }>(`/api/library/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteLibraryItem: (id: string) =>
    jsonFetch<{ id: string }>(`/api/library/${id}`, { method: "DELETE" }),

  listMembers: () =>
    jsonFetch<{
      members: { id: string; email: string; fullName: string | null; role: string; createdAt: string }[];
    }>("/api/org/members"),

  addMember: (input: { email: string; password: string; fullName?: string; role: string }) =>
    jsonFetch<{ id: string; email: string; role: string }>("/api/org/members", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateMember: (id: string, input: { role?: string; password?: string }) =>
    jsonFetch<{ id: string }>(`/api/org/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteMember: (id: string) =>
    jsonFetch<{ id: string }>(`/api/org/members/${id}`, { method: "DELETE" }),

  getAnalytics: () =>
    jsonFetch<{
      org: { library_count: number };
      tenders: {
        total: number;
        by_status: Record<string, number>;
        win_rate: number | null;
      };
      requirements: {
        total: number;
        by_status: Record<string, number>;
        answered: number;
        coverage: number;
        drafts_generated: number;
        draft_coverage: number;
      };
    }>("/api/analytics"),
};

