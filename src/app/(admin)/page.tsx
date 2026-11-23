"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText, SITE_URL } from "@/lib/api";
import type { Enrolment, Programme } from "@/lib/types";
import { PageHeader, useAdmin } from "@/components/AdminShell";
import { Badge, Card, Notice, Spinner } from "@/components/ui";

interface Summary { total: number; unseen: number; new: number; contacted: number; enrolled: number; not_interested: number }

export default function Dashboard() {
  const { user } = useAdmin();
  const [programmes, setProgrammes] = useState<Programme[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [latest, setLatest] = useState<Enrolment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ data: Programme[] }>("/api/cms/admin/programmes"),
      api<{ data: Summary }>("/api/cms/admin/enrolments/summary"),
      api<{ data: Enrolment[] }>("/api/cms/admin/enrolments?limit=6"),
    ])
      .then(([p, s, e]) => {
        setProgrammes(p.data);
        setSummary(s.data);
        setLatest(e.data);
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!programmes || !summary) return <Spinner />;

  const count = (s: string) => programmes.filter((p) => p.status === s).length;
  const stats = [
    { label: "Published programmes", value: count("published"), href: "/programmes" },
    { label: "Drafts", value: count("draft"), href: "/programmes" },
    { label: "New enrolments", value: summary.unseen, href: "/enrolments", highlight: summary.unseen > 0 },
    { label: "Total enrolments", value: summary.total, href: "/enrolments" },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome${user.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={
          <>
            Everything published here appears on{" "}
            <a href={SITE_URL} target="_blank" rel="noreferrer" className="underline">{SITE_URL.replace(/^https?:\/\//, "")}</a>.
          </>
        }
        actions={<Link href="/programmes/new" className="rounded-lg bg-[#ff5e00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e65400]">+ New programme</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`rounded-xl border bg-white p-5 shadow-sm hover:border-[#ff5e00] ${s.highlight ? "border-[#ff5e00]" : "border-neutral-200"}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Latest enrolments" actions={<Link href="/enrolments" className="text-sm text-[#c74a00] hover:underline">View all</Link>}>
          {latest.length === 0 ? (
            <p className="text-sm text-neutral-500">No enrolments yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {latest.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {e.name} {!e.seen_at && <Badge tone="red">Unread</Badge>}
                    </p>
                    <p className="truncate text-neutral-500">{e.programme_title}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">{new Date(e.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Programmes" actions={<Link href="/programmes" className="text-sm text-[#c74a00] hover:underline">Manage</Link>}>
          <ul className="divide-y divide-neutral-100">
            {programmes.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/programmes/${p.id}`} className="min-w-0 truncate font-medium hover:text-[#c74a00]">{p.data.title}</Link>
                <Badge tone={p.status === "published" ? "green" : p.status === "draft" ? "amber" : "neutral"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
