"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { api, type AuthUser } from "@/lib/api-client";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSeq, setErrorSeq] = useState(0);
  const reduce = useReducedMotion();

  // MFA — an intermediate code step after a correct password (or OAuth).
  const [mfaActive, setMfaActive] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [googleOauth, setGoogleOauth] = useState(false);

  useEffect(() => {
    // After a Google sign-in where the user has MFA, the callback lands on
    // /?mfa=1 with a pending-MFA cookie — pick up straight into the code step.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mfa") === "1") {
      setMode("login");
      setMfaActive(true);
      window.history.replaceState({}, "", "/");
    }
    api
      .authConfig()
      .then((c) => setGoogleOauth(c.google_oauth))
      .catch(() => setGoogleOauth(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const result = await api.signup({ email, password, fullName, orgName });
        onAuthenticated(result.user);
      } else {
        const result = await api.login({ email, password });
        if (result.mfa_required) {
          setMfaActive(true);
        } else if (result.user) {
          onAuthenticated(result.user);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setErrorSeq((s) => s + 1);
    } finally {
      setLoading(false);
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyMfa(mfaCode);
      onAuthenticated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
      setErrorSeq((s) => s + 1);
    } finally {
      setLoading(false);
    }
  }

  if (mfaActive) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="font-display text-2xl font-semibold tracking-tight text-ink">
              Bid<span className="text-ember">ently</span>
            </span>
            <p className="text-sm text-slate mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="size-4" /> Enter your 2-step verification code
            </p>
          </div>
          <motion.form
            onSubmit={submitMfa}
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="rounded-lg border border-slate-line bg-surface p-6 space-y-4 shadow-[var(--shadow-floating)]"
          >
            <input
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoFocus
              placeholder="000000"
              className="w-full text-center font-mono text-2xl tracking-[0.5em] rounded-md border border-slate-line bg-paper px-3 py-3 text-ink placeholder:text-slate/40 focus:border-ember/50 outline-none"
            />
            <FormError error={error} seq={errorSeq} reduce={reduce} />
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-ink text-paper py-2.5 text-sm font-medium hover:bg-ember disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="size-4 animate-spin" />} Verify & sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMfaActive(false);
                setMfaCode("");
                setError(null);
              }}
              className="w-full text-center text-xs text-slate hover:text-ember"
            >
              Back to sign in
            </button>
          </motion.form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Bid<span className="text-ember">ently</span>
          </span>
          <p className="text-sm text-slate mt-2">
            {mode === "signup"
              ? "Create a workspace — takes ten seconds, nothing to configure."
              : "Welcome back."}
          </p>
        </div>

        {googleOauth && (
          <>
            <a
              href="/api/auth/oauth/google"
              className="w-full flex items-center justify-center gap-2 rounded-md border border-slate-line bg-surface py-2.5 text-sm text-ink hover:border-ember/50 hover:bg-paper transition-colors mb-3"
            >
              <GoogleIcon /> Continue with Google
            </a>
            <div className="my-4 flex items-center gap-3 text-[11px] text-slate/70">
              <div className="h-px flex-1 bg-slate-line" /> or use email
              <div className="h-px flex-1 bg-slate-line" />
            </div>
          </>
        )}

        <motion.form
          onSubmit={submit}
          initial={reduce ? undefined : { opacity: 0, y: 12 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-lg border border-slate-line bg-surface p-6 space-y-4 shadow-[var(--shadow-floating)]"
        >
          {mode === "signup" && (
            <>
              <Field label="Your name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
                  placeholder="Ayesha Raza"
                />
              </Field>
              <Field label="Company / workspace name">
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
                  placeholder="Raza Engineering Services"
                />
              </Field>
            </>
          )}

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
              placeholder="you@company.com"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-slate/60 focus:border-ember/50 outline-none"
              placeholder="8+ characters"
            />
          </Field>

          <FormError error={error} seq={errorSeq} reduce={reduce} />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-ink text-paper py-2.5 text-sm font-medium hover:bg-ember disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create workspace" : "Sign in"}
          </button>
        </motion.form>

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="w-full text-center text-xs text-slate hover:text-ember mt-4 transition-colors"
        >
          {mode === "signup"
            ? "Already have a workspace? Sign in"
            : "New here? Create a workspace"}
        </button>

        <p className="text-center text-[11px] text-slate/70 mt-6">
          Local demo account — stored in your own SQLite database, not sent anywhere
          except your own server.
        </p>
      </div>
    </main>
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Animated inline validation error — appears with a small shake. */
function FormError({
  error,
  seq,
  reduce,
}: {
  error: string | null;
  seq: number;
  reduce: boolean;
}) {
  if (!error) return null;
  if (reduce) return <p className="text-xs text-attention">{error}</p>;
  return (
    <motion.p
      key={seq}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
      transition={{ duration: 0.35 }}
      className="text-xs text-attention"
      role="alert"
    >
      {error}
    </motion.p>
  );
}
