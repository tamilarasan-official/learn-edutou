"use client";

import { useEffect, useState } from "react";
import { api, errorText, json } from "@/lib/api";
import type { Category } from "@/lib/types";
import { PageHeader } from "@/components/AdminShell";
import { Button, Card, Notice, NumberInput, Spinner, StringList, Text } from "@/components/ui";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [savedDomains, setSavedDomains] = useState("");
  const [fresh, setFresh] = useState({ title: "", description: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () =>
    Promise.all([api<{ data: Category[] }>("/api/cms/admin/categories"), api<{ data: { items: string[] } }>("/api/cms/admin/settings/domains")])
      .then(([c, d]) => {
        setCats(c.data);
        setDomains(d.data.items);
        setSavedDomains(JSON.stringify(d.data.items));
      })
      .catch((e) => setError(errorText(e)));

  useEffect(() => {
    load();
  }, []);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(done);
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!cats) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;

  return (
    <>
      <PageHeader title="Categories & domains" description="Categories are the items under Programmes in the website menu. Domains are the filters and badges." />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          {cats.map((c) => (
            <CategoryRow
              key={c.id}
              c={c}
              onSave={(v) => run(() => api(`/api/cms/admin/categories/${c.id}`, json("PUT", v)), `Saved “${v.title}”.`)}
              onDelete={() =>
                window.confirm(`Delete the category “${c.title}”?`) && run(() => api(`/api/cms/admin/categories/${c.id}`, json("DELETE")), "Category deleted.")
              }
            />
          ))}
          <Card title="Add a category">
            <Text label="Title" value={fresh.title} onChange={(title) => setFresh({ ...fresh, title })} hint={fresh.title ? `Web address: /programmes/${slugify(fresh.title)}` : undefined} />
            <Text label="Description" value={fresh.description} onChange={(description) => setFresh({ ...fresh, description })} />
            <Button
              disabled={!fresh.title.trim()}
              onClick={() =>
                run(async () => {
                  await api("/api/cms/admin/categories", json("POST", { id: slugify(fresh.title), title: fresh.title, description: fresh.description, sortOrder: (cats.length + 1) * 10 }));
                  setFresh({ title: "", description: "" });
                }, "Category added.")
              }
            >
              Add category
            </Button>
          </Card>
        </div>

        <Card title="Domains" description="Used as filters on the website and as badges on programmes.">
          <StringList items={domains} onChange={setDomains} addLabel="Add domain" />
          <Button
            disabled={JSON.stringify(domains) === savedDomains}
            onClick={() => run(() => api("/api/cms/admin/settings/domains", json("PUT", { items: domains.map((x) => x.trim()).filter(Boolean) })), "Domains saved.")}
          >
            Save domains
          </Button>
        </Card>
      </div>
    </>
  );
}

function CategoryRow({ c, onSave, onDelete }: { c: Category; onSave: (v: { title: string; description: string; sortOrder: number }) => void; onDelete: () => void }) {
  const [v, setV] = useState({ title: c.title, description: c.description, sortOrder: c.sortOrder });
  const dirty = v.title !== c.title || v.description !== c.description || v.sortOrder !== c.sortOrder;
  return (
    <Card
      title={`${c.no} ${c.title}`}
      description={`/programmes/${c.id} · ${c.programmes ?? 0} programme${c.programmes === 1 ? "" : "s"}`}
      actions={<Button variant="danger" size="sm" onClick={onDelete} disabled={(c.programmes ?? 0) > 0} title={(c.programmes ?? 0) > 0 ? "Move its programmes first" : undefined}>Delete</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Text label="Title" value={v.title} onChange={(title) => setV({ ...v, title })} />
        <NumberInput label="Order" value={v.sortOrder} onChange={(n) => setV({ ...v, sortOrder: n ?? 0 })} />
      </div>
      <Text label="Description" value={v.description} onChange={(description) => setV({ ...v, description })} />
      <Button size="sm" disabled={!dirty} onClick={() => onSave(v)}>Save</Button>
    </Card>
  );
}
