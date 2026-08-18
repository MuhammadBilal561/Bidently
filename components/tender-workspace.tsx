"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Loader2,
  ChevronDown,
  CircleCheck,
  Circle,
  Sparkles,
  PenLine,
  AlertTriangle,
} from "lucide-react";
import type { DraftAnswer, ExtractedRequirement, ExtractionResult, TenderStatus } from "@/lib/types";
import { api } from "@/lib/api-client";
import { enterTransition, stateTransition } from "@/lib/motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { DraftSkeleton } from "@/components/ui/skeleton";
import {
  SAMPLE_PAKISTAN_TENDER,
  SAMPLE_WORLD_BANK_RFP,
} from "@/lib/sample-documents";

type Status = "idle" | "loading" | "result" | "error";

const CATEGORY_STYLE: Record<string, string> = {
  technical: "border-ink/25 text-ink",
  financial: "border-ember/40 text-ember",
  legal: "border-verified/40 text-verified",
  administrative: "border-attention/40 text-attention",
};

export function TenderWorkspace({
  initialResult,
  onSaved,
  onDeleted,
}: {
  initialResult?: ExtractionResult;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const [status, setStatus] = useState<Status>(initialResult ? "result" : "idle");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(initialResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer | "loading">>(() =>
    Object.fromEntries(
      (initialResult?.requirements ?? [])
        .filter((r) => r.draft)
        .map((r) => [
          r.id,
          {
            requirement_id: r.id,
            answer: r.draft!.answer,
            content_gap: r.draft!.content_gap,
            sources: [],
            mode: "live" as const,
          },
        ])
    )
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runExtraction(opts: { file?: File; text?: string }) {
    setStatus("loading");
    setError(null);
    try {
      const data = opts.file
        ? await api.extractFile(opts.file)
        : await api.extractText(opts.text ?? "");
      setResult(data);
      setStatus("result");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function generateDraftFor(req: ExtractedRequirement) {
    setDrafts((d) => ({ ...d, [req.id]: "loading" }));
    try {
      const data = await api.generateDraft(req);
      setDrafts((d) => ({ ...d, [req.id]: data }));
    } catch {
      setDrafts((d) => {
        const next = { ...d };
        delete next[req.id];
        return next;
      });
    }
  }

  async function updateStatus(status: string) {
    if (!result?.tender_id) return;
    try {
      await api.updateTenderStatus(result.tender_id, status as TenderStatus);
      setResult((r) => (r ? { ...r, status: status as TenderStatus } : r));
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    }
  }

  async function deleteTender() {
    if (!result?.tender_id) return;
    if (!window.confirm("Delete this tender and all its requirements and drafts?")) return;
    try {
      await api.deleteTender(result.tender_id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete tender.");
    }
  }

  function loadSample(text: string, label: string) {
    setPastedText(text);
    setFileName(label);
  }

  function reset() {
    setStatus("idle");
    setResult(null);
    setError(null);
    setPastedText("");
    setFileName(null);
    setExpandedId(null);
    setDrafts({});
  }

  if (status === "idle" || status === "loading") {
    return (
      <div>
        <div className="max-w-2xl mb-10">
          <h1 className="font-display text-[2.2rem] leading-[1.1] font-medium text-ink mb-4">
            Upload a tender. Get a compliance matrix, grounded to the page.
          </h1>
          <p className="text-slate text-[15px] leading-relaxed">
            Every requirement below traces back to the exact line it came from — nothing
            here is invented. Try it with a real document, or one of the two samples
            below (styled on genuine PPRA and World Bank procurement conventions).
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-lg border border-slate-line bg-surface p-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-line hover:border-ember/50 hover:bg-ember-soft/40 transition-colors py-9 text-center"
            >
              <UploadCloud className="size-6 text-slate" strokeWidth={1.5} />
              <span className="text-sm text-ink font-medium">
                Drop a tender PDF or .txt, or click to browse
              </span>
              <span className="text-xs text-slate">Saved to your own local database</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runExtraction({ file: f });
              }}
            />

            <div className="my-5 flex items-center gap-3 text-xs text-slate">
              <div className="h-px flex-1 bg-slate-line" />
              or paste text
              <div className="h-px flex-1 bg-slate-line" />
            </div>

            <textarea
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                setFileName(null);
              }}
              placeholder="Paste tender or RFP text here…"
              className="w-full h-28 resize-none rounded-md border border-slate-line bg-paper p-3 text-sm text-ink placeholder:text-slate/70 focus:border-ember/50 outline-none"
            />

            <button
              disabled={!pastedText.trim() || status === "loading"}
              onClick={() => runExtraction({ text: pastedText })}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-md bg-ink text-paper py-2.5 text-sm font-medium hover:bg-ember disabled:opacity-40 disabled:hover:bg-ink transition-colors"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Extract requirements
                </>
              )}
            </button>
          </div>

          <div className="rounded-lg border border-slate-line bg-surface p-6">
            <h2 className="text-xs font-mono uppercase tracking-wide text-slate mb-4">
              Try a sample
            </h2>
            <div className="space-y-3">
              <SampleCard
                title="Pakistan · IT procurement tender"
                subtitle="Federal government, network security equipment"
                onClick={() => loadSample(SAMPLE_PAKISTAN_TENDER, "sample-pakistan-tender.txt")}
              />
              <SampleCard
                title="World Bank · Consulting RFP"
                subtitle="Renewable-energy feasibility study, two-envelope process"
                onClick={() => loadSample(SAMPLE_WORLD_BANK_RFP, "sample-worldbank-rfp.txt")}
              />
            </div>
            {fileName && (
              <div className="mt-4 flex items-center gap-2 text-xs text-verified">
                <FileText className="size-3.5" />
                Loaded: {fileName} — click Extract to run it
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-attention/30 bg-attention-soft p-5 text-sm text-attention">
        {error}
        <button onClick={reset} className="ml-3 underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  if (status === "result" && result) {
    return (
      <ResultsView
        result={result}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        onReset={reset}
        drafts={drafts}
        onGenerateDraft={generateDraftFor}
        onUpdateStatus={updateStatus}
        onDeleteTender={deleteTender}
      />
    );
  }

  return null;
}

function SampleCard({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md border border-slate-line p-3.5 hover:border-ember/40 hover:bg-ember-soft/30 transition-colors"
    >
      <div className="text-sm font-medium text-ink">{title}</div>
      <div className="text-xs text-slate mt-0.5">{subtitle}</div>
    </button>
  );
}

function ResultsView({
  result,
  expandedId,
  setExpandedId,
  onReset,
  drafts,
  onGenerateDraft,
  onUpdateStatus,
  onDeleteTender,
}: {
  result: ExtractionResult;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onReset: () => void;
  drafts: Record<string, DraftAnswer | "loading">;
  onGenerateDraft: (req: ExtractedRequirement) => void;
  onUpdateStatus: (status: string) => void;
  onDeleteTender: () => void;
}) {
  const mandatoryCount = result.requirements.filter((r) => r.is_mandatory).length;
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 8 }}
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={stateTransition(0.35)}
    >
      {result.mode === "mock" && (
        <div className="mb-6 rounded-md border border-slate-line bg-surface px-4 py-2.5 text-xs text-slate flex items-center gap-2">
          <Circle className="size-2 fill-attention text-attention" />
          Demo mode — no <code className="font-mono">GEMINI_API_KEY</code> set, showing
          representative extraction. Add a free key to run this on your own documents.
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-8 pb-6 border-b border-slate-line">
        <div>
          <h2 className="font-display text-2xl font-medium text-ink mb-1">
            {result.document_title}
          </h2>
          <p className="text-sm text-slate">
            {result.issuing_body && <>{result.issuing_body} · </>}
            {result.submission_deadline
              ? `Deadline: ${result.submission_deadline}`
              : "Deadline not detected"}
          </p>
          {result.tender_id && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-[11px] font-mono uppercase tracking-wide text-slate">
                Status
              </label>
              <select
                value={result.status ?? "in_progress"}
                onChange={(e) => onUpdateStatus(e.target.value)}
                className="rounded-md border border-slate-line bg-surface px-2 py-1 text-xs text-ink focus:border-ember/50 outline-none"
              >
                {["identified", "in_progress", "submitted", "won", "lost"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => exportCsv(result)}
            className="text-xs text-slate hover:text-ink underline underline-offset-2"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportMarkdown(result)}
            className="text-xs text-slate hover:text-ink underline underline-offset-2"
          >
            Export bid (.md)
          </button>
          {result.tender_id && (
            <button
              onClick={onDeleteTender}
              className="text-xs text-slate hover:text-attention underline underline-offset-2"
            >
              Delete
            </button>
          )}
          <button
            onClick={onReset}
            className="shrink-0 text-xs text-slate hover:text-ink underline underline-offset-2"
          >
            New tender
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-6 text-sm">
        <div>
          <CountUp value={result.requirements.length} className="font-mono text-lg text-ink" />
          <span className="text-slate ml-1.5">requirements found</span>
        </div>
        <div>
          <CountUp value={mandatoryCount} className="font-mono text-lg text-ember" />
          <span className="text-slate ml-1.5">mandatory</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-line bg-surface divide-y divide-slate-line overflow-hidden">
        {result.requirements.map((req) => (
          <RequirementRow
            key={req.id}
            req={req}
            expanded={expandedId === req.id}
            onToggle={() => setExpandedId(expandedId === req.id ? null : req.id)}
            draft={drafts[req.id]}
            onGenerateDraft={() => onGenerateDraft(req)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function RequirementRow({
  req,
  expanded,
  onToggle,
  draft,
  onGenerateDraft,
}: {
  req: ExtractedRequirement;
  expanded: boolean;
  onToggle: () => void;
  draft: DraftAnswer | "loading" | undefined;
  onGenerateDraft: () => void;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        {req.is_mandatory ? (
          <CircleCheck className="size-4 text-ember mt-0.5 shrink-0" strokeWidth={2} />
        ) : (
          <Circle className="size-4 text-slate/50 mt-0.5 shrink-0" strokeWidth={2} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 ${
                CATEGORY_STYLE[req.category] ?? "border-slate-line text-slate"
              }`}
            >
              {req.category}
            </span>
            {!req.is_mandatory && (
              <span className="text-[10px] font-mono uppercase tracking-wide text-slate">
                optional
              </span>
            )}
            {req.evaluation_weight != null && (
              <span className="text-[10px] font-mono text-slate">
                weight {req.evaluation_weight}%
              </span>
            )}
          </div>

          <p className="text-sm text-ink leading-relaxed">{req.requirement_text}</p>

          <button
            onClick={onToggle}
            className="mt-2 flex items-center gap-1 text-xs text-slate hover:text-ember transition-colors"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "Hide source" : "View source"}
            {req.source_page != null && <span className="font-mono">· p.{req.source_page}</span>}
          </button>

          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={stateTransition()}
              className="overflow-hidden"
            >
              <div className="mt-2.5 rounded-md bg-ember-soft/50 border-l-2 border-ember px-3.5 py-2.5">
                <p className="text-xs text-ink/80 font-mono leading-relaxed">
                  &ldquo;{req.source_snippet}&rdquo;
                </p>
              </div>
            </motion.div>
          )}

          {!draft && (
            <button
              onClick={onGenerateDraft}
              className="mt-2.5 flex items-center gap-1.5 text-xs text-slate hover:text-ember transition-colors"
            >
              <PenLine className="size-3.5" />
              Draft an answer from content library
            </button>
          )}

          {draft === "loading" && (
            <div className="mt-2.5">
              <DraftSkeleton />
            </div>
          )}

          {draft && draft !== "loading" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stateTransition()}
              className="mt-2.5 rounded-md border border-slate-line bg-paper px-3.5 py-3"
            >
              {draft.content_gap ? (
                <div className="flex items-start gap-2 text-xs text-attention">
                  <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
                  No content-library item matches this closely enough to draft from —
                  flagged as a content gap instead of guessing.
                </div>
              ) : (
                <>
                  <p className="text-sm text-ink leading-relaxed">{draft.answer}</p>
                  {draft.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {draft.sources.map((s, i) => (
                        <motion.span
                          key={s.content_id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={enterTransition(0.1 + i * 0.06)}
                          className="text-[10px] font-mono text-verified bg-verified-soft rounded-full px-2 py-0.5"
                        >
                          from: {s.title}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Export helpers (client-side file generation) ----

function downloadFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Compliance matrix as a CSV the user can open in Excel / Google Sheets. */
function exportCsv(result: ExtractionResult) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "requirement",
    "category",
    "mandatory",
    "page",
    "source_snippet",
    "status",
    "draft_answer",
  ];
  const rows = result.requirements.map((r) => [
    r.requirement_text,
    r.category,
    r.is_mandatory ? "yes" : "no",
    r.source_page ?? "",
    r.source_snippet,
    r.status ?? "",
    r.draft?.answer ?? "",
  ]);
  const csv = [header, ...rows].map((row) => row.map(esc).join(",")).join("\n");
  const safeName = (result.document_title || "tender").replace(/[\\/:*?"<>|]/g, "_");
  downloadFile(`${safeName}-compliance.csv`, csv, "text/csv;charset=utf-8");
}

/** A Markdown bid package (drafts + sources) ready to drop into a proposal doc. */
function exportMarkdown(result: ExtractionResult) {
  const lines: string[] = [];
  lines.push(`# ${result.document_title}`);
  if (result.issuing_body) lines.push(`**Issuing body:** ${result.issuing_body}`);
  if (result.submission_deadline) lines.push(`**Deadline:** ${result.submission_deadline}`);
  lines.push("");
  lines.push(`_Generated by Bidently — ${result.requirements.length} requirements._`);
  lines.push("");

  result.requirements.forEach((r, i) => {
    lines.push(`## ${i + 1}. ${r.category} — ${r.is_mandatory ? "mandatory" : "optional"}`);
    lines.push("");
    lines.push(r.requirement_text);
    if (r.source_page != null) lines.push(`\n> Source: page ${r.source_page}`);
    if (r.source_snippet) lines.push(`> “${r.source_snippet}”`);
    lines.push("");
    if (r.draft && !r.draft.content_gap) {
      lines.push(r.draft.answer);
    } else {
      lines.push("_No grounded draft generated for this requirement yet._");
    }
    lines.push("");
  });

  const safeName = (result.document_title || "bid").replace(/[\\/:*?"<>|]/g, "_");
  downloadFile(`${safeName}-bid.md`, lines.join("\n"), "text/markdown;charset=utf-8");
}

/** Counts 0 → `value` once, on first render (one light entrance moment). */
function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let start: number | null = null;
    let raf = 0;
    const duration = 600;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <span className={className}>{reduce ? value : display}</span>;
}

