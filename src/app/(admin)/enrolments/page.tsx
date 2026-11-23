"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, errorText, json } from "@/lib/api";
import { PAYMENT_LABEL, STATUS_LABEL, type Enrolment, type EnrolmentStatus, type PaymentStatus } from "@/lib/types";
import { PageHeader, useAdmin } from "@/components/AdminShell";
import { Badge, Button, cx, inputClass, Notice, Spinner } from "@/components/ui";

const STATUS_TONE: Record<EnrolmentStatus, "brand" | "blue" | "green" | "neutral"> = {
  new: "brand",
  contacted: "blue",
  enrolled: "green",
  not_interested: "neutral",
};
const PAY_TONE: Record<PaymentStatus, "neutral" | "amber" | "green" | "red"> = {
  not_required: "neutral",
  pending: "amber",
  paid: "green",
  failed: "red",
  refunded: "neutral",
};

function toCsv(rows: Enrolment[]): string {
  const cols: (keyof Enrolment)[] = [
    "created_at", "programme_title", "name", "email", "whatsapp", "profession", "city", "status", "notes",
    "amount", "currency", "payment_status", "payment_reference", "utm_source", "utm_medium", "utm_campaign",
  ];
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s) && !/^\+\d+$/.test(s)) s = `'${s}`; // no spreadsheet formulas
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
}

export default function EnrolmentsPage() {
  const { refreshCounts } = useAdmin();
  const [rows, setRows] = useState<Enrolment[] | null>(null);
  const [status, setStatus] = useState<"" | EnrolmentStatus>("");
  const [programme, setProgramme] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [allProgrammes, setAllProgrammes] = useState<{ key: string; title: string }[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "2000" });
    if (status) params.set("status", status);
    if (programme) params.set("programme", programme);
    if (q.trim()) params.set("q", q.trim());
    try {
      const res = await api<{ data: Enrolment[] }>(`/api/cms/admin/enrolments?${params}`);
      setRows(res.data);
    } catch (e) {
      setError(errorText(e));
    }
  }, [status, programme, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  // Programme filter options come from every enrolment, not just the filtered ones.
  useEffect(() => {
    api<{ data: Enrolment[] }>("/api/cms/admin/enrolments?limit=5000")
      .then((r) => {
        const seen = new Map<string, string>();
        r.data.forEach((e) => seen.set(e.programme_key, e.programme_title));
        setAllProgrammes([...seen].map(([key, title]) => ({ key, title })));
      })
      .catch(() => {});
  }, []);

  const unseenHere = useMemo(() => (rows ?? []).filter((r) => !r.seen_at).length, [rows]);

  const update = async (r: Enrolment, patch: { status?: EnrolmentStatus; notes?: string; paymentStatus?: PaymentStatus; paymentReference?: string }) => {
    try {
      await api(`/api/cms/admin/enrolments/${r.id}`, json("PATCH", patch));
      await load();
      refreshCounts();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const markAllSeen = async () => {
    await api("/api/cms/admin/enrolments/mark-seen", json("POST")).catch((e) => setError(errorText(e)));
    await load();
    refreshCounts();
  };

  const remove = async (r: Enrolment) => {
    if (!window.confirm(`Delete the enrolment from ${r.name}? This cannot be undone.`)) return;
    await api(`/api/cms/admin/enrolments/${r.id}`, json("DELETE")).catch((e) => setError(errorText(e)));
    await load();
    refreshCounts();
  };

  const exportCsv = () => {
    if (!rows?.length) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    a.download = `edutou-enrolments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Enrolments"
        description="Everyone who enrolled from edutou.in/enroll. Unread ones are highlighted until you open them."
        actions={
          <>
            <Button variant="secondary" disabled={!unseenHere} onClick={markAllSeen}>Mark all as seen</Button>
            <Button variant="secondary" disabled={!rows?.length} onClick={exportCsv}>Export CSV</Button>
          </>
        }
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr]">
        <select value={status} onChange={(e) => setStatus(e.target.value as "" | EnrolmentStatus)} className={inputClass} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={programme} onChange={(e) => setProgramme(e.target.value)} className={inputClass} aria-label="Filter by programme">
          <option value="">All programmes</option>
          {allProgrammes.map((p) => <option key={p.key} value={p.key}>{p.title}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or city" className={inputClass} />
      </div>

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">No enrolments match.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <p className="border-b border-neutral-100 px-4 py-2 text-xs text-neutral-500">{rows.length} enrolment{rows.length === 1 ? "" : "s"}</p>
          <ul className="divide-y divide-neutral-100">
            {rows.map((r) => {
              const isOpen = open === r.id;
              return (
                <li key={r.id} className={cx(!r.seen_at && "bg-orange-50/60")}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(isOpen ? null : r.id);
                      if (!r.seen_at) update(r, {});
                    }}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left sm:flex-row sm:items-center sm:gap-4"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 font-medium">
                        {r.name}
                        {!r.seen_at && <Badge tone="red">Unread</Badge>}
                        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                        {r.payment_status !== "not_required" && <Badge tone={PAY_TONE[r.payment_status]}>Payment: {PAYMENT_LABEL[r.payment_status]}</Badge>}
                      </p>
                      <p className="truncate text-sm text-neutral-500">{r.programme_title}</p>
                    </div>
                    <div className="text-sm text-neutral-600 sm:text-right">
                      <p>{r.whatsapp}</p>
                      <p className="text-xs text-neutral-400">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                  </button>
                  {isOpen && <EnrolmentDetail r={r} onUpdate={(p) => update(r, p)} onDelete={() => remove(r)} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

function EnrolmentDetail({
  r,
  onUpdate,
  onDelete,
}: {
  r: Enrolment;
  onUpdate: (p: { status?: EnrolmentStatus; notes?: string; paymentStatus?: PaymentStatus; paymentReference?: string }) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(r.notes);
  const [ref, setRef] = useState(r.payment_reference ?? "");
  const wa = `https://wa.me/${r.whatsapp.replace(/\D/g, "")}`;
  return (
    <div className="grid gap-4 border-t border-neutral-100 bg-neutral-50 px-4 py-4 text-sm lg:grid-cols-3">
      <dl className="space-y-1.5">
        <div><dt className="text-xs text-neutral-500">Email</dt><dd><a href={`mailto:${r.email}`} className="underline">{r.email}</a></dd></div>
        <div><dt className="text-xs text-neutral-500">WhatsApp</dt><dd><a href={wa} target="_blank" rel="noreferrer" className="underline">{r.whatsapp}</a></dd></div>
        <div><dt className="text-xs text-neutral-500">Profession · City</dt><dd>{r.profession} · {r.city}</dd></div>
        <div><dt className="text-xs text-neutral-500">Source</dt><dd>{[r.utm_source, r.utm_medium, r.utm_campaign].filter(Boolean).join(" / ") || "Direct"}</dd></div>
      </dl>
      <div className="space-y-2">
        <label className="block text-xs text-neutral-500">Status</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STATUS_LABEL) as EnrolmentStatus[]).map((s) => (
            <button key={s} type="button" onClick={() => onUpdate({ status: s })} className={cx("rounded-full px-3 py-1 text-xs font-medium ring-1", r.status === s ? "bg-neutral-900 text-white ring-neutral-900" : "bg-white text-neutral-700 ring-neutral-300")}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <label className="block pt-2 text-xs text-neutral-500" htmlFor={`notes-${r.id}`}>Notes</label>
        <textarea id={`notes-${r.id}`} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        <Button size="sm" variant="secondary" disabled={notes === r.notes} onClick={() => onUpdate({ notes })}>Save notes</Button>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Payment {r.amount ? `· ${r.currency} ${Number(r.amount).toLocaleString("en-IN")}` : ""}</p>
        <select value={r.payment_status} onChange={(e) => onUpdate({ paymentStatus: e.target.value as PaymentStatus })} className={inputClass} aria-label="Payment status">
          {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Payment reference / receipt no." className={inputClass} />
        <div className="flex justify-between">
          <Button size="sm" variant="secondary" disabled={ref === (r.payment_reference ?? "")} onClick={() => onUpdate({ paymentReference: ref })}>Save reference</Button>
          <Button size="sm" variant="danger" onClick={onDelete}>Delete</Button>
        </div>
      </div>
    </div>
  );
}
