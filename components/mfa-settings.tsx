"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "@/lib/api-client";

export function MfaSettings() {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .mfaStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, enabled: false }));
  }, []);

  async function setup() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api.mfaSetup();
      setStatus((s) => (s ? { ...s, configured: true } : s));
      if (!res.enabled && res.secret && res.otpauth_url) {
        setSecret(res.secret);
        setOtpauth(res.otpauth_url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup.");
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.mfaEnable(code);
      setStatus((s) => (s ? { ...s, enabled: true, configured: true } : s));
      setSecret(null);
      setOtpauth(null);
      setCode("");
      setNotice("Two-factor authentication is now on.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.mfaDisable(code);
      setStatus((s) => (s ? { ...s, enabled: false } : s));
      setCode("");
      setNotice("Two-factor authentication is off.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable.");
    } finally {
      setBusy(false);
    }
  }

  if (status === null) {
    return (
      <div className="rounded-lg border border-slate-line bg-surface p-5 flex items-center gap-2 text-sm text-slate">
        <Loader2 className="size-4 animate-spin" /> Checking two-factor…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-line bg-surface p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono uppercase tracking-wide text-slate">
          Two-factor authentication
        </h3>
        {status.enabled ? (
          <span className="flex items-center gap-1 text-[11px] text-verified">
            <ShieldCheck className="size-3.5" /> Enabled
          </span>
        ) : (
          <span className="text-[11px] text-slate">Not enabled</span>
        )}
      </div>

      {status.enabled ? (
        <form onSubmit={disable} className="flex flex-wrap items-end gap-3 mt-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-slate mb-1">
              Enter a current code to turn it off
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-full font-mono tracking-[0.4em] rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/40 focus:border-ember/50 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="flex items-center gap-1.5 rounded-md border border-slate-line px-3 py-2 text-xs text-attention hover:bg-attention-soft/40 disabled:opacity-40"
          >
            <ShieldOff className="size-3.5" /> Disable
          </button>
        </form>
      ) : secret && otpauth ? (
        <form onSubmit={enable} className="mt-3 space-y-3">
          <p className="text-xs text-slate">
            Scan this with your authenticator app (Google Authenticator, Authy,
            1Password…), then enter the 6-digit code it shows to confirm.
          </p>
          <div className="rounded-md bg-paper border border-slate-line px-3 py-2">
            <div className="text-[10px] font-mono uppercase text-slate mb-1">Setup key</div>
            <div className="font-mono text-sm text-ink break-all select-all">{secret}</div>
          </div>
          <div className="rounded-md bg-paper border border-slate-line px-3 py-2">
            <div className="text-[10px] font-mono uppercase text-slate mb-1">otpauth link</div>
            <a href={otpauth} className="font-mono text-xs text-ember break-all">
              {otpauth}
            </a>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="w-40 font-mono tracking-[0.4em] rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/40 focus:border-ember/50 outline-none"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="flex items-center gap-1.5 rounded-md bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-ember disabled:opacity-50"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />} Enable
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate">
            Add a second factor so a leaked password alone can't sign in.
          </p>
          <button
            onClick={setup}
            disabled={busy}
            className="shrink-0 flex items-center gap-1.5 rounded-md bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-ember disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Set up
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-attention">{error}</p>}
      {notice && <p className="mt-3 text-xs text-verified">{notice}</p>}
    </div>
  );
}
