"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText, json } from "@/lib/api";
import { PageHeader } from "@/components/AdminShell";
import { Badge, Button, Card, cx, inputClass, Notice, NumberInput, Spinner, Toggle } from "@/components/ui";

type ConnState = "off" | "disconnected" | "connecting" | "qr" | "connected" | "logged_out";
interface Status {
  enabledOnServer: boolean;
  connection: { state: ConnState; qrDataUrl: string | null; me: string | null; lastError: string | null; since: string };
  stats: { pending: number; sent: number; failed: number; not_on_whatsapp: number; skipped: number; sent_24h: number };
  backfillCount: number;
}
interface WaSettings {
  enabled: boolean;
  paused: boolean;
  batchMin: number;
  batchMax: number;
  gapMinSeconds: number;
  gapMaxSeconds: number;
  pauseMinMinutes: number;
  pauseMaxMinutes: number;
  dailyCap: number;
  startHour: number;
  endHour: number;
  templates: string[];
}
type QStatus = "pending" | "sending" | "sent" | "failed" | "skipped" | "not_on_whatsapp";
interface QRow {
  id: string;
  to_number: string;
  body: string;
  status: QStatus;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  name: string | null;
  programme_title: string | null;
}

const Q_LABEL: Record<QStatus, string> = {
  pending: "Waiting",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
  not_on_whatsapp: "Not on WhatsApp",
};
const Q_TONE: Record<QStatus, "amber" | "green" | "red" | "neutral" | "blue"> = {
  pending: "amber",
  sending: "blue",
  sent: "green",
  failed: "red",
  skipped: "neutral",
  not_on_whatsapp: "neutral",
};
const STATE_LABEL: Record<ConnState, [string, "green" | "amber" | "red" | "neutral" | "blue"]> = {
  off: ["Off", "neutral"],
  disconnected: ["Not connected", "amber"],
  connecting: ["Connecting…", "blue"],
  qr: ["Scan the QR code", "blue"],
  connected: ["Connected", "green"],
  logged_out: ["Unlinked", "red"],
};

export default function WhatsAppPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [saved, setSaved] = useState("");
  const [queue, setQueue] = useState<QRow[]>([]);
  const [filter, setFilter] = useState<"" | QStatus>("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStatus = useCallback(() => api<{ data: Status }>("/api/cms/admin/whatsapp/status").then((r) => setStatus(r.data)), []);
  const loadQueue = useCallback(
    () => api<{ data: QRow[] }>(`/api/cms/admin/whatsapp/queue${filter ? `?status=${filter}` : ""}`).then((r) => setQueue(r.data)),
    [filter],
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([api<{ data: Status }>("/api/cms/admin/whatsapp/status"), api<{ data: WaSettings }>("/api/cms/admin/settings/whatsapp")])
      .then(([s, w]) => {
        if (cancelled) return;
        setStatus(s.data);
        setSettings(w.data);
        setSaved(JSON.stringify(w.data));
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadQueue().catch((e) => setError(errorText(e)));
  }, [loadQueue]);

  // Poll fast while pairing, slowly otherwise.
  const state = status?.connection.state;
  useEffect(() => {
    const fast = state === "qr" || state === "connecting";
    const t = setInterval(() => {
      loadStatus().catch(() => {});
      if (!fast) loadQueue().catch(() => {});
    }, fast ? 3000 : 20000);
    return () => clearInterval(t);
  }, [state, loadStatus, loadQueue]);

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      await fn();
      if (done) setNotice(done);
      await Promise.all([loadStatus(), loadQueue()]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  };

  if (!status || !settings) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;
  const set = (patch: Partial<WaSettings>) => setSettings({ ...settings, ...patch });
  const dirty = JSON.stringify(settings) !== saved;
  const c = status.connection;
  const [stateLabel, stateTone] = STATE_LABEL[c.state];
  const days = Math.ceil((status.backfillCount + status.stats.pending) / Math.max(1, settings.dailyCap));

  const saveSettings = () =>
    act(
      "save",
      async () => {
        const r = await api<{ data: WaSettings }>("/api/cms/admin/settings/whatsapp", json("PUT", { ...settings, templates: settings.templates.map((t) => t.trim()).filter(Boolean) }));
        setSettings(r.data);
        setSaved(JSON.stringify(r.data));
      },
      "Saved.",
    );

  return (
    <>
      <PageHeader title="WhatsApp" description="Messages to everyone who enrols, sent slowly from your WhatsApp number." />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* ---------- Connection ---------- */}
        <Card title="Your WhatsApp number" actions={<Badge tone={stateTone}>{stateLabel}</Badge>}>
          {!status.enabledOnServer ? (
            <Notice>Add <code>WHATSAPP_ENABLED=true</code> to the API&apos;s environment in Dokploy and redeploy it, then come back here to connect.</Notice>
          ) : c.state === "connected" ? (
            <>
              <p className="text-sm text-neutral-700">
                Linked to <strong>+{c.me}</strong>. Messages go out from this number.
              </p>
              <p className="text-xs text-neutral-500">Keep the phone charged and online now and then; WhatsApp unlinks devices whose phone stays offline for about 2 weeks.</p>
              <Button
                variant="danger"
                size="sm"
                disabled={!!busy}
                onClick={() => window.confirm("Unlink this number? Sending stops until you scan a new QR code.") && act("logout", () => api("/api/cms/admin/whatsapp/logout", json("POST")), "Unlinked.")}
              >
                Unlink number
              </Button>
            </>
          ) : c.state === "qr" && c.qrDataUrl ? (
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.qrDataUrl} alt="WhatsApp QR code" width={220} height={220} className="rounded-lg border border-neutral-200" />
              <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                <li>Open WhatsApp on the phone with your number.</li>
                <li>Tap <strong>⋮ / Settings → Linked devices → Link a device</strong>.</li>
                <li>Point the phone at this code.</li>
              </ol>
            </div>
          ) : c.state === "connecting" ? (
            <Spinner label="Connecting to WhatsApp…" />
          ) : (
            <>
              {c.lastError && <Notice tone="error">{c.lastError}</Notice>}
              <p className="text-sm text-neutral-600">Link your number once by scanning a QR code with WhatsApp. It stays linked across redeploys.</p>
              <Button disabled={!!busy} onClick={() => act("connect", () => api("/api/cms/admin/whatsapp/connect", json("POST")))}>
                {busy === "connect" ? "Starting…" : "Connect WhatsApp"}
              </Button>
            </>
          )}
        </Card>

        {/* ---------- Numbers ---------- */}
        <Card title="Messages">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Waiting to send" value={status.stats.pending} />
            <Stat label={`Sent in 24 h (limit ${settings.dailyCap})`} value={status.stats.sent_24h} />
            <Stat label="Sent in total" value={status.stats.sent} />
            <Stat label="Not on WhatsApp / failed" value={`${status.stats.not_on_whatsapp} / ${status.stats.failed}`} />
          </div>
          <Toggle
            label={settings.paused ? "Sending is paused" : "Sending"}
            hint="Pause stops sending right away; new enrolments keep queueing."
            checked={!settings.paused}
            onChange={(on) => {
              const next = { ...settings, paused: !on };
              setSettings(next);
              act("pause", async () => {
                const r = await api<{ data: WaSettings }>("/api/cms/admin/settings/whatsapp", json("PUT", next));
                setSaved(JSON.stringify(r.data));
              }, on ? "Sending resumed." : "Sending paused.");
            }}
          />
          {status.backfillCount > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
              <p>
                <strong>{status.backfillCount}</strong> people enrolled before WhatsApp was set up and have not had a message.
              </p>
              <p className="mt-1 text-xs text-neutral-600">At up to {settings.dailyCap} a day, everything waiting takes about {days} day{days === 1 ? "" : "s"}.</p>
              <Button
                size="sm"
                className="mt-2"
                disabled={!!busy}
                onClick={() =>
                  window.confirm(`Queue a WhatsApp message to ${status.backfillCount} people? They will be sent slowly, a few at a time.`) &&
                  act("backfill", () => api("/api/cms/admin/whatsapp/backfill", json("POST")), `Queued ${status.backfillCount} messages.`)
                }
              >
                {busy === "backfill" ? "Queueing…" : `Message all ${status.backfillCount}`}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* ---------- Settings ---------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pace" description="Small irregular batches look like a person sending." actions={<Button size="sm" disabled={!dirty || !!busy} onClick={saveSettings}>Save</Button>}>
          <Toggle label="Message every new enrolment" checked={settings.enabled} onChange={(enabled) => set({ enabled })} />
          <Range label="Messages per batch" a={settings.batchMin} b={settings.batchMax} onA={(batchMin) => set({ batchMin })} onB={(batchMax) => set({ batchMax })} />
          <Range label="Gap between messages (seconds)" a={settings.gapMinSeconds} b={settings.gapMaxSeconds} onA={(gapMinSeconds) => set({ gapMinSeconds })} onB={(gapMaxSeconds) => set({ gapMaxSeconds })} />
          <Range label="Pause between batches (minutes)" a={settings.pauseMinMinutes} b={settings.pauseMaxMinutes} onA={(pauseMinMinutes) => set({ pauseMinMinutes })} onB={(pauseMaxMinutes) => set({ pauseMaxMinutes })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberInput label="Max per 24 hours" value={settings.dailyCap} onChange={(v) => set({ dailyCap: v ?? 1 })} />
            <NumberInput label="From hour (IST)" hint="0–23" value={settings.startHour} onChange={(v) => set({ startHour: v ?? 0 })} />
            <NumberInput label="Until hour (IST)" hint="24 = midnight" value={settings.endHour} onChange={(v) => set({ endHour: v ?? 24 })} />
          </div>
          <p className="text-xs text-neutral-500">{settings.startHour === 0 && settings.endHour === 24 ? "Sending around the clock." : `Sending only between ${settings.startHour}:00 and ${settings.endHour}:00 IST.`}</p>
        </Card>

        <Card title="Message versions" description="One is picked at random for each person. {name} (first name), {programme} and {whatsapp} (group link) are filled in." actions={<Button size="sm" disabled={!dirty || !!busy} onClick={saveSettings}>Save</Button>}>
          {settings.templates.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <textarea rows={3} value={t} onChange={(e) => set({ templates: settings.templates.map((x, j) => (j === i ? e.target.value : x)) })} className={inputClass} aria-label={`Message version ${i + 1}`} />
              <Button variant="danger" size="sm" disabled={settings.templates.length <= 1} onClick={() => set({ templates: settings.templates.filter((_, j) => j !== i) })} aria-label="Remove version">✕</Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" disabled={settings.templates.length >= 10} onClick={() => set({ templates: [...settings.templates, ""] })}>+ Add version</Button>
        </Card>
      </div>

      {/* ---------- Queue ---------- */}
      <Card title="Queue">
        <div className="flex flex-wrap gap-2">
          {(["", "pending", "sent", "not_on_whatsapp", "failed", "skipped"] as const).map((f) => (
            <button key={f || "all"} type="button" onClick={() => setFilter(f)} className={cx("rounded-full px-3 py-1 text-sm", filter === f ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200")}>
              {f ? Q_LABEL[f] : "All"}
            </button>
          ))}
        </div>
        {queue.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {queue.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {m.name ?? m.to_number} <Badge tone={Q_TONE[m.status]}>{Q_LABEL[m.status]}</Badge>
                  </p>
                  <p className="text-neutral-500">{m.to_number}{m.programme_title ? ` · ${m.programme_title}` : ""}</p>
                  <p className="mt-1 line-clamp-2 text-neutral-600">{m.body}</p>
                  {m.last_error && m.status !== "sent" && <p className="mt-1 text-xs text-red-600">{m.last_error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-neutral-400">{new Date(m.sent_at ?? m.created_at).toLocaleString()}</span>
                  {m.status === "pending" && (
                    <Button variant="ghost" size="sm" onClick={() => act(m.id, () => api(`/api/cms/admin/whatsapp/queue/${m.id}/skip`, json("POST")))}>Skip</Button>
                  )}
                  {(m.status === "failed" || m.status === "skipped" || m.status === "not_on_whatsapp") && (
                    <Button variant="secondary" size="sm" onClick={() => act(m.id, () => api(`/api/cms/admin/whatsapp/queue/${m.id}/retry`, json("POST")))}>Retry</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Range({ label, a, b, onA, onB }: { label: string; a: number; b: number; onA: (v: number) => void; onB: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-neutral-700">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput hint="From" value={a} onChange={(v) => onA(v ?? 1)} />
        <NumberInput hint="To (random in between)" value={b} onChange={(v) => onB(v ?? 1)} />
      </div>
    </div>
  );
}
