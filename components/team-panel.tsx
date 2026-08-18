"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserRound, ShieldCheck } from "lucide-react";
import { api, type AuthUser } from "@/lib/api-client";

interface Member {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

const ASSIGNABLE_ROLES = ["admin", "bid_manager", "contributor", "reviewer"] as const;

export function TeamPanel({ user }: { user: AuthUser }) {
  const canManage = user.role === "owner" || user.role === "admin";
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-member form — visible only to owners/admins.
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("contributor");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listMembers();
      setMembers(data.members);
      setError(null);
    } catch (e) {
      setMembers([]);
      setError(e instanceof Error ? e.message : "Could not load members.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, [refresh]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.addMember({ email, password, fullName: fullName || undefined, role });
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("contributor");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, nextRole: string) {
    try {
      await api.updateMember(id, { role: nextRole });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this member from the workspace?")) return;
    try {
      await api.deleteMember(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-medium text-ink">Team</h2>
          <p className="text-sm text-slate mt-1">
            People in your workspace and what they can do. Your role:{" "}
            <span className="font-mono text-ink">{user.role}</span>
            {!canManage && " — you can view members but not manage them."}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate">
          <ShieldCheck className="size-3.5" />
          {members === null ? "…" : `${members.length} member${members.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <p className="text-sm text-attention">{error}</p>}

      {canManage && (
        <form
          onSubmit={addMember}
          className="rounded-lg border border-slate-line bg-surface p-5 space-y-4"
        >
          <h3 className="text-xs font-mono uppercase tracking-wide text-slate">Add a teammate</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
                placeholder="colleague@company.com"
              />
            </Field>
            <Field label="Full name (optional)">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
                placeholder="Their name"
              />
            </Field>
            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink focus:border-ember/50 outline-none"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Temporary password (8+ chars)">
              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
                placeholder="Set a starting password"
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving || !email || !password}
            className="flex items-center justify-center gap-2 rounded-md bg-ink text-paper px-4 py-2.5 text-sm font-medium hover:bg-ember disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Plus className="size-4" /> Add member
          </button>
        </form>
      )}

      {members === null ? (
        <div className="flex items-center gap-2 text-sm text-slate">
          <Loader2 className="size-4 animate-spin" /> Loading members…
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-line px-5 py-8 text-center text-sm text-slate">
          <UserRound className="size-5 mx-auto mb-2 text-slate/60" strokeWidth={1.5} />
          No members yet.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-line bg-surface divide-y divide-slate-line overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-ink font-medium truncate">{m.fullName || m.email}</div>
                <div className="text-xs text-slate">{m.email}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-wide border border-slate-line rounded-full px-2 py-0.5 text-slate">
                  {m.role}
                </span>
                {canManage && m.role !== "owner" && (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="rounded-md border border-slate-line bg-surface px-2 py-1 text-xs text-ink focus:border-ember/50 outline-none"
                    aria-label={`Role for ${m.email}`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                )}
                {canManage && m.role !== "owner" && (
                  <button
                    onClick={() => remove(m.id)}
                    className="p-1.5 text-slate hover:text-attention rounded-md hover:bg-attention-soft/40 transition-colors"
                    aria-label={`Remove ${m.email}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
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

