"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorText, json, SITE_URL } from "@/lib/api";
import { PageHeader } from "@/components/AdminShell";
import { Badge, Button, Card, Notice, Spinner, Text, Toggle } from "@/components/ui";

interface Status {
  enabled: boolean;
  projectId: string;
  tokenConfigured: boolean;
  days: number;
  links: { dashboard: string; recordings: string; heatmaps: string; settings: string } | null;
}
interface Metric {
  metricName: string;
  information: Record<string, unknown>[];
}
interface Report {
  report: string;
  days: number;
  fetchedAt: string;
  nextRefreshAt: string;
  metrics: Metric[];
  cached: boolean;
}
interface Settings {
  clarityEnabled: boolean;
  clarityProjectId: string;
}

/** Events the website sends to Clarity (see edutou-2026 src/data/analytics.js). */
const EVENTS = [
  { name: "programme_viewed", when: "Someone opens a programme's full page" },
  { name: "enrol_submitted", when: "The enrol form is submitted" },
  { name: "enrol_completed", when: "Enrolment saved (free or pay-later programmes)" },
  { name: "payment_started", when: "Razorpay checkout opens" },
  { name: "payment_completed", when: "Payment verified and enrolment confirmed" },
  { name: "payment_cancelled", when: "Checkout closed without paying" },
  { name: "payment_failed", when: "Razorpay reported a failed payment" },
];

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v: unknown) => {
  const n = num(v);
  if (n == null) return String(v ?? "—");
  return Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
/** "totalSessionCount" -> "Total session count" */
const humanize = (k: string) =>
  k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

const traffic = (r: Report | null) => r?.metrics.find((m) => m.metricName.toLowerCase() === "traffic");

/** Rows of a breakdown report: dimension value + Traffic numbers, busiest first. */
function breakdown(r: Report | null, dimension: string) {
  const t = traffic(r);
  if (!t) return [];
  return t.information
    .map((row) => {
      const key = Object.keys(row).find((k) => k.toLowerCase() === dimension.toLowerCase());
      return {
        label: String((key && row[key]) || "(none)"),
        sessions: num(row.totalSessionCount) ?? 0,
        users: num(row.distantUserCount),
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 12);
}

export default function AnalyticsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedSettings, setSavedSettings] = useState("");
  const [reports, setReports] = useState<Record<string, Report | null>>({});
  const [dataError, setDataError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStatus = useCallback(async () => {
    const [s, a] = await Promise.all([
      api<{ data: Status }>("/api/cms/admin/analytics/status"),
      api<{ data: Settings }>("/api/cms/admin/settings/analytics"),
    ]);
    setStatus(s.data);
    setSettings(a.data);
    setSavedSettings(JSON.stringify(a.data));
    return s.data;
  }, []);

  const loadData = useCallback(async (refresh = false) => {
    setLoadingData(true);
    setDataError("");
    const out: Record<string, Report | null> = {};
    for (const report of ["overview", "pages", "sources"]) {
      try {
        const r = await api<{ data: Report }>(`/api/cms/admin/analytics/clarity?report=${report}${refresh ? "&refresh=1" : ""}`);
        out[report] = r.data;
      } catch (e) {
        out[report] = null;
        setDataError(e instanceof ApiError ? e.message : errorText(e));
        break;
      }
    }
    setReports(out);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<{ data: Status }>("/api/cms/admin/analytics/status"),
      api<{ data: Settings }>("/api/cms/admin/settings/analytics"),
    ])
      .then(([s, a]) => {
        if (cancelled) return;
        setStatus(s.data);
        setSettings(a.data);
        setSavedSettings(JSON.stringify(a.data));
        if (s.data.tokenConfigured) loadData();
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const saveSettings = async () => {
    if (!settings) return;
    setError("");
    setNotice("");
    try {
      await api("/api/cms/admin/settings/analytics", json("PUT", settings));
      await loadStatus();
      setNotice(settings.clarityEnabled ? "Saved. Clarity loads on the website for new visitors." : "Saved. Clarity is switched off on the website.");
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!status || !settings) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;

  const overview = reports.overview ?? null;
  const t = traffic(overview)?.information[0] ?? null;
  const otherMetrics = (overview?.metrics ?? []).filter((m) => m.metricName.toLowerCase() !== "traffic" && m.information.length > 0);
  const pages = breakdown(reports.pages ?? null, "URL");
  const sources = breakdown(reports.sources ?? null, "Source");

  return (
    <>
      <PageHeader
        title="Analytics & Event Tracking"
        description={<>How visitors use {SITE_URL.replace(/^https?:\/\//, "")}, from Microsoft Clarity.</>}
        actions={
          status.links && (
            <>
              <a href={status.links.dashboard} target="_blank" rel="noreferrer" className="rounded-lg bg-[#ff5e00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e65400]">
                Open Clarity ↗
              </a>
              <a href={status.links.recordings} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50">
                Recordings ↗
              </a>
              <a href={status.links.heatmaps} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50">
                Heatmaps ↗
              </a>
            </>
          )
        }
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}

      {/* ---------------- Data ---------------- */}
      {!status.tokenConfigured ? (
        <Card title="Visitor numbers" className="mb-6">
          <Notice>
            To show Clarity numbers here: in Clarity open <strong>Settings → Data Export → Generate new API token</strong>, then add it to the API&apos;s
            environment in Dokploy as <code>CLARITY_API_TOKEN</code> and redeploy. Recordings and heatmaps open in Clarity with the buttons above.
          </Notice>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
            <span>
              Last {status.days} days
              {overview && <> · updated {ago(overview.fetchedAt)} · next update after {new Date(overview.nextRefreshAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
            </span>
            <Button variant="secondary" size="sm" disabled={loadingData} onClick={() => loadData(true)}>
              {loadingData ? "Loading…" : "Refresh"}
            </Button>
          </div>
          {dataError && <div className="mb-4"><Notice tone="error">{dataError}</Notice></div>}
          {loadingData && !overview ? (
            <Spinner label="Fetching from Clarity…" />
          ) : (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Sessions", value: t?.totalSessionCount },
                  { label: "Unique visitors", value: t?.distantUserCount },
                  { label: "Pages per session", value: t?.PagesPerSessionPercentage ?? t?.pagesPerSessionPercentage },
                  { label: "Bot sessions (excluded)", value: t?.totalBotSessionCount },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <p className="text-3xl font-bold">{s.value == null ? "—" : fmt(s.value)}</p>
                    <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <Card title="Top pages" description="Sessions by page.">
                  <BreakdownTable rows={pages} empty="No page data yet." />
                </Card>
                <Card title="Traffic sources" description="Where visitors came from.">
                  <BreakdownTable rows={sources} empty="No source data yet." />
                </Card>
              </div>

              {otherMetrics.length > 0 && (
                <Card title="Behaviour signals" description="Scroll depth, engagement, rage and dead clicks, errors, as reported by Clarity." className="mb-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {otherMetrics.map((m) => (
                      <div key={m.metricName} className="rounded-lg border border-neutral-200 p-3">
                        <p className="font-medium">{humanize(m.metricName)}</p>
                        <dl className="mt-1 space-y-0.5 text-sm">
                          {Object.entries(m.information[0]!)
                            .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2">
                                <dt className="text-neutral-500">{humanize(k)}</dt>
                                <dd className="font-medium">{fmt(v)}</dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* ---------------- Events + setup ---------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Events tracked on the website" description="In Clarity, filter recordings by these under Filters → Custom events, or by the “programme” tag.">
          <ul className="divide-y divide-neutral-100 text-sm">
            {EVENTS.map((e) => (
              <li key={e.name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                <code className="text-[#c74a00]">{e.name}</code>
                <span className="text-neutral-600">{e.when}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="Clarity setup"
          actions={<Badge tone={status.enabled ? "green" : "amber"}>{status.enabled ? "Tracking on" : "Off"}</Badge>}
        >
          <Toggle label="Load Clarity on the website" checked={settings.clarityEnabled} onChange={(clarityEnabled) => setSettings({ ...settings, clarityEnabled })} />
          <Text
            label="Clarity project ID"
            hint="From the Clarity URL: clarity.microsoft.com/projects/view/<ID>/…"
            value={settings.clarityProjectId}
            onChange={(clarityProjectId) => setSettings({ ...settings, clarityProjectId: clarityProjectId.trim() })}
          />
          <p className="text-xs text-neutral-500">
            Clarity masks what people type into forms by default, so names, emails and phone numbers are not recorded.
          </p>
          <div className="flex items-center gap-2">
            <Button disabled={JSON.stringify(settings) === savedSettings} onClick={saveSettings}>Save</Button>
            <Badge tone={status.tokenConfigured ? "green" : "neutral"}>{status.tokenConfigured ? "Data export connected" : "Data export not connected"}</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}

function BreakdownTable({ rows, empty }: { rows: { label: string; sessions: number; users: number | null }[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.sessions), 1);
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate" title={r.label}>{r.label.replace(/^https?:\/\/(www\.)?/, "")}</span>
            <span className="shrink-0 font-medium">{r.sessions.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-[#ff5e00]" style={{ width: `${(r.sessions / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
