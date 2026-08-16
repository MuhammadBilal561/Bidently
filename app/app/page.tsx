"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, type AuthUser } from "@/lib/api-client";
import type { ExtractionResult } from "@/lib/types";
import { AuthScreen } from "@/components/auth-screen";
import { TopBar } from "@/components/top-bar";
import { TenderList } from "@/components/tender-list";
import { TenderWorkspace } from "@/components/tender-workspace";
import { ContentLibraryPanel } from "@/components/content-library-panel";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { TeamPanel } from "@/components/team-panel";
import { MfaSettings } from "@/components/mfa-settings";

type View = { name: "dashboard" } | { name: "tender"; result?: ExtractionResult };
type DashboardTab = "tenders" | "analytics" | "library" | "team";
const DASHBOARD_TABS: { key: DashboardTab; label: string }[] = [
  { key: "tenders", label: "Tenders" },
  { key: "analytics", label: "Analytics" },
  { key: "library", label: "Content library" },
  { key: "team", label: "Team" },
];

export default function AppShell() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [tab, setTab] = useState<DashboardTab>("tenders");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingTenderId, setLoadingTenderId] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then((d) => setUser(d.user))
      .finally(() => setChecking(false));
  }, []);

  async function openTender(id: string) {
    setLoadingTenderId(id);
    try {
      const result = await api.getTender(id);
      setView({ name: "tender", result });
    } catch {
      // tender vanished or doesn't belong to this org — just stay on the dashboard
    } finally {
      setLoadingTenderId(null);
    }
  }

  if (checking) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="size-5 animate-spin text-slate" />
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <>
      <TopBar
        user={user}
        onLogout={async () => {
          await api.logout();
          setUser(null);
          setView({ name: "dashboard" });
        }}
      />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {view.name === "dashboard" && (
            <>
              <div className="flex items-center gap-6 mb-8 border-b border-slate-line overflow-x-auto">
                {DASHBOARD_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`pb-3 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors ${
                      tab === t.key
                        ? "border-ember text-ink font-medium"
                        : "border-transparent text-slate hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "library" ? (
                <ContentLibraryPanel />
              ) : tab === "analytics" ? (
                <AnalyticsPanel />
              ) : tab === "team" ? (
                <div className="space-y-6">
                  <MfaSettings />
                  <TeamPanel user={user} />
                </div>
              ) : (
                <>
                  <TenderList
                    onOpen={openTender}
                    onNew={() => setView({ name: "tender" })}
                    refreshKey={refreshKey}
                  />
                  {loadingTenderId ? (
                    <div className="flex items-center gap-2 text-sm text-slate py-6">
                      <Loader2 className="size-4 animate-spin" /> Opening tender…
                    </div>
                  ) : (
                    <TenderWorkspace
                      onSaved={() => setRefreshKey((k) => k + 1)}
                      onDeleted={() => {
                        setView({ name: "dashboard" });
                        setTab("tenders");
                        setRefreshKey((k) => k + 1);
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {view.name === "tender" && (
            <>
              <button
                onClick={() => setView({ name: "dashboard" })}
                className="mb-6 text-xs text-slate hover:text-ink underline underline-offset-2"
              >
                ← Back to your tenders
              </button>
              <TenderWorkspace
                initialResult={view.result}
                onSaved={() => setRefreshKey((k) => k + 1)}
                onDeleted={() => {
                  setView({ name: "dashboard" });
                  setTab("tenders");
                  setRefreshKey((k) => k + 1);
                }}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}