"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, BookOpen, X } from "lucide-react";
import { api } from "@/lib/api-client";
import type { ContentLibraryItem, RequirementCategory } from "@/lib/types";

const CATEGORIES: RequirementCategory[] = [
  "technical",
  "financial",
  "legal",
  "administrative",
];

const CATEGORY_STYLE: Record<string, string> = {
  technical: "border-ink/25 text-ink",
  financial: "border-ember/40 text-ember",
  legal: "border-verified/40 text-verified",
  administrative: "border-attention/40 text-attention",
};

export function ContentLibraryPanel() {
  const [items, setItems] = useState<ContentLibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-edit form state. `editingId` non-null means we're updating that item.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<RequirementCategory>("administrative");
  const [tagsText, setTagsText] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listLibrary();
      setItems(data.items);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Could not load content library.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setCategory("administrative");
    setTagsText("");
  }

  function startEdit(item: ContentLibraryItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setCategory(item.category);
    setTagsText(item.tags.join(", "));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      if (editingId) {
        await api.updateLibraryItem(editingId, { title, body, category, tags });
      } else {
        await api.addLibraryItem({ title, body, category, tags });
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this content-library item? Drafts that cite it will keep their text but lose the source link.")) return;
    try {
      await api.deleteLibraryItem(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete item.");
    }
  }

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-medium text-ink">Content library</h2>
        <span className="text-xs text-slate">
          {items === null ? "…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <p className="text-sm text-slate leading-relaxed mb-5 max-w-2xl">
        This is the company knowledge the drafting engine grounds answers in.
        Add certifications, case studies, warranty terms, and compliance
        statements — each draft that uses one is traced back to it.
      </p>

      <form
        onSubmit={submit}
        className="rounded-lg border border-slate-line bg-surface p-5 space-y-4 mb-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate">
            {editingId ? "Edit item" : "Add item"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 text-xs text-slate hover:text-ember"
            >
              <X className="size-3.5" /> Cancel edit
            </button>
          )}
        </div>

        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
            placeholder="ISO 27001 & Manufacturer Certifications"
          />
        </Field>

        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            maxLength={50000}
            className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none resize-y"
            placeholder="The grounding text the draft generator may quote from."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RequirementCategory)}
              className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink focus:border-ember/50 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
              placeholder="certification, ISO, OEM"
            />
          </Field>
        </div>

        {error && <p className="text-xs text-attention">{error}</p>}

        <button
          type="submit"
          disabled={saving || !title.trim() || !body.trim()}
          className="flex items-center justify-center gap-2 rounded-md bg-ink text-paper px-4 py-2.5 text-sm font-medium hover:bg-ember disabled:opacity-50 transition-colors"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          <Plus className="size-4" />
          {editingId ? "Save changes" : "Add to library"}
        </button>
      </form>
      {items === null ? (
        <div className="flex items-center gap-2 text-sm text-slate">
          <Loader2 className="size-4 animate-spin" /> Loading content library…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-line px-5 py-8 text-center text-sm text-slate">
          <BookOpen className="size-5 mx-auto mb-2 text-slate/60" strokeWidth={1.5} />
          No content-library items yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wide border rounded-full px-2 py-0.5 ${
                        CATEGORY_STYLE[item.category] ?? "border-slate-line text-slate"
                      }`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate leading-relaxed mt-1.5 line-clamp-3">
                    {item.body}
                  </p>
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono text-slate bg-paper border border-slate-line rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 text-slate hover:text-ember rounded-md hover:bg-ember-soft/40 transition-colors"
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="p-1.5 text-slate hover:text-attention rounded-md hover:bg-attention-soft/40 transition-colors"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate mb-1.5">{label}</span>
      {children}
    </label>
  );
}
