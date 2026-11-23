"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, errorText, json, previewUrl, SITE_URL } from "@/lib/api";
import { priceLabel, type Category, type Programme, type ProgrammeStatus } from "@/lib/types";
import { PageHeader } from "@/components/AdminShell";
import { Badge, Button, inputClass, Notice, Spinner } from "@/components/ui";

const STATUS_TONE = { published: "green", draft: "amber", hidden: "neutral" } as const;

export default function ProgrammesPage() {
  const [items, setItems] = useState<Programme[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<"all" | ProgrammeStatus>("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([api<{ data: Programme[] }>("/api/cms/admin/programmes"), api<{ data: Category[] }>("/api/cms/admin/categories")])
      .then(([p, c]) => {
        setItems(p.data);
        setCategories(c.data);
      })
      .catch((e) => setError(errorText(e)));

  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(
    () =>
      (items ?? []).filter(
        (p) => (filter === "all" || p.status === filter) && (!q || `${p.data.title} ${p.data.type} ${p.slug}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, filter, q],
  );

  const catTitle = (id: string) => categories.find((c) => c.id === id)?.title ?? id;

  const setStatus = async (p: Programme, status: ProgrammeStatus) => {
    try {
      await api(`/api/cms/admin/programmes/${p.id}/status`, json("PATCH", { status }));
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const duplicate = async (p: Programme) => {
    try {
      await api(`/api/cms/admin/programmes/${p.id}/duplicate`, json("POST"));
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const remove = async (p: Programme) => {
    if (!window.confirm(`Delete "${p.data.title}"? This cannot be undone. Its enrolments are kept.`)) return;
    try {
      await api(`/api/cms/admin/programmes/${p.id}`, json("DELETE"));
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Programmes"
        description="Courses, webinars, workshops, bootcamps and internships shown on the website."
        actions={<Link href="/programmes/new" className="rounded-lg bg-[#ff5e00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e65400]">+ New programme</Link>}
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "published", "draft", "hidden"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${filter === s ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"}`}
          >
            {s} {items && <span className="opacity-60">({s === "all" ? items.length : items.filter((p) => p.status === s).length})</span>}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputClass} ml-auto max-w-xs`} />
      </div>

      {!items ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          No programmes here yet. <Link href="/programmes/new" className="text-[#c74a00] underline">Create one</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((p) => {
            const price = priceLabel(p.data.pricing);
            const liveUrl = `${SITE_URL}/programmes/${p.data.category}${p.data.page.enabled ? `/${p.slug}` : ""}`;
            return (
              <article key={p.id} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:w-28">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.data.image.url && <img src={previewUrl(p.data.image.url)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    <Badge tone="brand">{p.data.type}</Badge>
                    {price && <Badge tone={p.data.pricing.model === "free" ? "green" : "blue"}>{price}</Badge>}
                    <Badge>{catTitle(p.data.category)}</Badge>
                    {p.data.page.enabled && <Badge>Full page</Badge>}
                  </div>
                  <Link href={`/programmes/${p.id}`} className="mt-1.5 block truncate font-semibold hover:text-[#c74a00]">{p.data.title}</Link>
                  <p className="truncate text-xs text-neutral-500">/{p.slug} · order {p.sortOrder} · updated {new Date(p.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Link href={`/programmes/${p.id}`} className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm hover:bg-neutral-50">Edit</Link>
                  {p.status === "published" ? (
                    <>
                      <a href={liveUrl} target="_blank" rel="noreferrer" className="rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100">View ↗</a>
                      <Button variant="ghost" size="sm" onClick={() => setStatus(p, "hidden")}>Unpublish</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setStatus(p, "published")}>Publish</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => duplicate(p)}>Duplicate</Button>
                  <Button variant="danger" size="sm" onClick={() => remove(p)}>Delete</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
