"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errorText, json, SITE_URL } from "@/lib/api";
import { emptyProgramme, formatMoney, PROGRAMME_TYPES, priceLabel, type Category, type Programme, type ProgrammeData, type ProgrammeStatus } from "@/lib/types";
import { PageHeader } from "@/components/AdminShell";
import BlockEditor from "@/components/BlockEditor";
import { Badge, Button, Card, cx, Field, ImageInput, inputClass, Notice, NumberInput, ObjectList, Select, Spinner, StringList, Text, Toggle } from "@/components/ui";

const TABS = [
  { id: "basics", label: "Basics" },
  { id: "card", label: "Card" },
  { id: "page", label: "Full page" },
  { id: "pricing", label: "Pricing & enrolment" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

interface Draft { slug: string; status: ProgrammeStatus; sortOrder: number; data: ProgrammeData }

export default function ProgrammeEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("basics");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Confirmation carried over from creating a programme (see save()).
  const flash = useSearchParams().get("notice") ?? "";

  useEffect(() => {
    Promise.all([
      api<{ data: Category[] }>("/api/cms/admin/categories"),
      api<{ data: { items: string[] } }>("/api/cms/admin/settings/domains"),
      isNew ? Promise.resolve(null) : api<{ data: Programme }>(`/api/cms/admin/programmes/${id}`),
    ])
      .then(([c, d, p]) => {
        setCategories(c.data);
        setDomains(d.data.items);
        const initial: Draft = p
          ? { slug: p.data.slug, status: p.data.status, sortOrder: p.data.sortOrder, data: p.data.data }
          : { slug: "", status: "draft", sortOrder: 100, data: emptyProgramme(c.data[0]?.id ?? "") };
        setDraft(initial);
        setSaved(JSON.stringify(initial));
      })
      .catch((e) => setError(errorText(e)));
  }, [id, isNew]);

  const dirty = draft !== null && JSON.stringify(draft) !== saved;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const liveUrl = useMemo(() => {
    if (!draft) return SITE_URL;
    return `${SITE_URL}/programmes/${draft.data.category}${draft.data.page.enabled ? `/${draft.slug}` : ""}`;
  }, [draft]);

  if (error && !draft) return <Notice tone="error">{error}</Notice>;
  if (!draft) return <Spinner />;

  const d = draft.data;
  const setData = (patch: Partial<ProgrammeData>) => setDraft({ ...draft, data: { ...d, ...patch } });
  const setCard = (patch: Partial<ProgrammeData["card"]>) => setData({ card: { ...d.card, ...patch } });
  const setPage = (patch: Partial<ProgrammeData["page"]>) => setData({ page: { ...d.page, ...patch } });

  const save = async (status?: ProgrammeStatus) => {
    setBusy(true);
    setError("");
    setNotice("");
    if (flash) router.replace(`/programmes/${id}`);
    const body = { ...draft, status: status ?? draft.status };
    try {
      const res = isNew
        ? await api<{ data: Programme }>("/api/cms/admin/programmes", json("POST", body))
        : await api<{ data: Programme }>(`/api/cms/admin/programmes/${id}`, json("PUT", body));
      const p = res.data;
      const next: Draft = { slug: p.slug, status: p.status, sortOrder: p.sortOrder, data: p.data };
      setDraft(next);
      setSaved(JSON.stringify(next));
      const message = next.status === "published" ? "Saved and live on the website." : `Saved as ${next.status}. It is not visible on the website.`;
      // A new programme moves to its own address; carry the confirmation across the reload.
      // (The page may or may not remount on that navigation; covering both.)
      setNotice(message);
      if (isNew) router.replace(`/programmes/${p.id}?notice=${encodeURIComponent(message)}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const price = priceLabel(d.pricing);

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/programmes" className="text-neutral-500 hover:text-neutral-800">← Programmes</Link></div>
      <PageHeader
        title={d.title || (isNew ? "New programme" : "Untitled programme")}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={draft.status === "published" ? "green" : draft.status === "draft" ? "amber" : "neutral"}>{draft.status}</Badge>
            <Badge tone="brand">{d.type}</Badge>
            {price && <Badge tone={d.pricing.model === "free" ? "green" : "blue"}>{price}</Badge>}
            {dirty && <span className="text-amber-700">Unsaved changes</span>}
          </span>
        }
        actions={
          <>
            {draft.status === "published" && !isNew && (
              <a href={liveUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50">View on site ↗</a>
            )}
            <Button variant="secondary" disabled={busy || (!dirty && !isNew)} onClick={() => save()}>
              {draft.status === "published" ? "Save" : "Save draft"}
            </Button>
            {draft.status !== "published" ? (
              <Button disabled={busy} onClick={() => save("published")}>Publish</Button>
            ) : (
              <Button variant="secondary" disabled={busy} onClick={() => save("hidden")}>Unpublish</Button>
            )}
          </>
        }
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {(notice || flash) && <div className="mb-4"><Notice tone="success">{notice || flash}</Notice></div>}

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx("whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium", tab === t.id ? "border-[#ff5e00] text-[#c74a00]" : "border-transparent text-neutral-500 hover:text-neutral-800")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basics" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="What it is">
            <Text
              label="Title"
              value={d.title}
              onChange={(title) => setDraft({ ...draft, slug: slugTouched ? draft.slug : slugify(title), data: { ...d, title } })}
            />
            <Field label="Type" hint="Shown as a badge. Pick one or type your own.">
              <input list="programme-types" value={d.type} onChange={(e) => setData({ type: e.target.value })} className={inputClass} />
              <datalist id="programme-types">{PROGRAMME_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Text
              label="Web address"
              hint={`${SITE_URL.replace(/^https?:\/\//, "")}/programmes/${d.category || "…"}/${draft.slug || "…"}`}
              value={draft.slug}
              onChange={(v) => {
                setSlugTouched(true);
                setDraft({ ...draft, slug: slugify(v) });
              }}
            />
            <ImageInput label="Programme image" hint="Shown on the card and as the page image." value={d.image.url} onChange={(url) => setData({ image: { ...d.image, url } })} />
            <Text label="Image description (alt text)" value={d.image.alt} onChange={(alt) => setData({ image: { ...d.image, alt } })} />
          </Card>

          <div className="space-y-6">
            <Card title="Where it appears">
              <Select label="Category (Programmes menu)" value={d.category} onChange={(category) => setData({ category, alsoIn: d.alsoIn.filter((x) => x !== category) })} options={categories.map((c) => ({ value: c.id, label: `${c.no} ${c.title}` }))} />
              <Field label="Also list under">
                <div className="flex flex-wrap gap-2">
                  {categories.filter((c) => c.id !== d.category).map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm">
                      <input type="checkbox" checked={d.alsoIn.includes(c.id)} onChange={(e) => setData({ alsoIn: e.target.checked ? [...d.alsoIn, c.id] : d.alsoIn.filter((x) => x !== c.id) })} />
                      {c.title}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Domains" hint="Badges and filters on the website. Manage the list under Categories & domains.">
                <div className="flex flex-wrap gap-2">
                  {domains.map((dm) => (
                    <label key={dm} className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm">
                      <input type="checkbox" checked={d.domains.includes(dm)} onChange={(e) => setData({ domains: e.target.checked ? [...d.domains, dm] : d.domains.filter((x) => x !== dm) })} />
                      {dm}
                    </label>
                  ))}
                </div>
              </Field>
              <NumberInput label="Display order" hint="Lower numbers appear first." value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v ?? 0 })} />
            </Card>

            <Card title="Schedule" description="For webinars and workshops. Leave empty if it does not apply.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Start date" type="date" value={d.schedule.startDate} onChange={(startDate) => setData({ schedule: { ...d.schedule, startDate } })} />
                <Text label="Time" placeholder="7:00 PM IST" value={d.schedule.time} onChange={(time) => setData({ schedule: { ...d.schedule, time } })} />
                <Text label="Duration" placeholder="90 minutes / 3 days" value={d.schedule.duration} onChange={(duration) => setData({ schedule: { ...d.schedule, duration } })} />
                <Text label="Mode" placeholder="Online / On campus" value={d.schedule.mode} onChange={(mode) => setData({ schedule: { ...d.schedule, mode } })} />
                <Text label="Language" value={d.schedule.language} onChange={(language) => setData({ schedule: { ...d.schedule, language } })} />
                <NumberInput label="Seats" value={d.schedule.seats} onChange={(seats) => setData({ schedule: { ...d.schedule, seats } })} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "card" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Card on the programme list">
            <StringList label="Info line" hint="Shown in orange, joined with “·”. E.g. “3 days”, “Online”." items={d.card.meta} onChange={(meta) => setCard({ meta })} addLabel="Add item" />
            <Text label="Short description" multiline rows={4} value={d.card.summary} onChange={(summary) => setCard({ summary })} />
            <StringList label="Highlights (bullet points)" items={d.card.highlights} onChange={(highlights) => setCard({ highlights })} addLabel="Add highlight" />
            <StringList label="Tools" items={d.card.tools} onChange={(tools) => setCard({ tools })} addLabel="Add tool" />
          </Card>
          <Card title="“Roles & live projects” panel" description="Expandable section at the bottom of the card.">
            <Toggle label="Show this panel" checked={d.card.details.enabled} onChange={(enabled) => setCard({ details: { ...d.card.details, enabled } })} />
            {d.card.details.enabled && (
              <>
                <StringList label="Roles" items={d.card.details.roles} onChange={(roles) => setCard({ details: { ...d.card.details, roles } })} addLabel="Add role" />
                <StringList label="Sample projects" items={d.card.details.projects} onChange={(projects) => setCard({ details: { ...d.card.details, projects } })} addLabel="Add project" />
                <Text label="Note" multiline value={d.card.details.note} onChange={(note) => setCard({ details: { ...d.card.details, note } })} />
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "page" && (
        <div className="space-y-6">
          <Toggle label="Has a full programme page" hint="Adds a “View full programme” button on the card." checked={d.page.enabled} onChange={(enabled) => setPage({ enabled })} />
          {d.page.enabled && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Page header">
                  <Text label="Small label above the title" placeholder="Industry Internship Programme" value={d.page.eyebrow} onChange={(eyebrow) => setPage({ eyebrow })} />
                  <Text label="Tagline" multiline value={d.page.tagline} onChange={(tagline) => setPage({ tagline })} />
                  <StringList label="Topic chips" items={d.page.topics} onChange={(topics) => setPage({ topics })} addLabel="Add topic" />
                  <Text label="Main button text" value={d.page.primaryButton} onChange={(primaryButton) => setPage({ primaryButton })} hint="Opens the enrol page with this programme selected." />
                </Card>
                <Card title="Key facts and counsellor">
                  <ObjectList label="Fact boxes" items={d.page.facts} onChange={(facts) => setPage({ facts })} blank={{ value: "", label: "" }} addLabel="Add fact" fields={[{ key: "value", label: "Value" }, { key: "label", label: "Label" }]} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Text label="Counsellor name" value={d.page.counsellor.name} onChange={(name) => setPage({ counsellor: { ...d.page.counsellor, name } })} />
                    <Text label="Counsellor phone" value={d.page.counsellor.phone} onChange={(phone) => setPage({ counsellor: { ...d.page.counsellor, phone } })} hint="Shows a “Call” button when set." />
                  </div>
                </Card>
              </div>

              <div>
                <h2 className="mb-3 text-lg font-semibold">Page sections</h2>
                <BlockEditor blocks={d.page.blocks} onChange={(blocks) => setPage({ blocks })} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card title="Related programmes" description="Other published programmes from the same category.">
                  <Toggle label="Show related programmes" checked={d.page.related.enabled} onChange={(enabled) => setPage({ related: { ...d.page.related, enabled } })} />
                  <Text label="Small label" value={d.page.related.label} onChange={(label) => setPage({ related: { ...d.page.related, label } })} />
                  <Text label="Heading" value={d.page.related.title} onChange={(title) => setPage({ related: { ...d.page.related, title } })} />
                </Card>
                <Card title="Closing banner">
                  <Text label="Heading" value={d.page.cta.title} onChange={(title) => setPage({ cta: { ...d.page.cta, title } })} />
                  <Text label="Text" multiline value={d.page.cta.text} onChange={(text) => setPage({ cta: { ...d.page.cta, text } })} />
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Price" description="Shown on the programme card, its page and the enrol page.">
            <Select
              label="Pricing"
              value={d.pricing.model}
              onChange={(model) => setData({ pricing: { ...d.pricing, model } })}
              options={[
                { value: "free", label: "Free" },
                { value: "paid", label: "Paid" },
                { value: "hidden", label: "Don't show a price" },
              ]}
            />
            {d.pricing.model === "paid" && (
              <>
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <Select
                    label="Currency"
                    value={d.pricing.currency === "USD" ? "USD" : "INR"}
                    onChange={(currency) => setData({ pricing: { ...d.pricing, currency } })}
                    options={[
                      { value: "INR", label: "₹ INR" },
                      { value: "USD", label: "$ USD" },
                    ]}
                  />
                  <NumberInput
                    label="Price (what people pay)"
                    hint="e.g. 99. Leave empty to show the price note instead."
                    value={d.pricing.amount}
                    onChange={(amount) => setData({ pricing: { ...d.pricing, amount } })}
                  />
                </div>
                <Toggle
                  label="Show a strike-through price"
                  hint="For offers: shows the original price crossed out next to the price."
                  checked={!!d.pricing.showCompareAt}
                  onChange={(showCompareAt) => setData({ pricing: { ...d.pricing, showCompareAt } })}
                />
                {d.pricing.showCompareAt && (
                  <NumberInput
                    label="Original price (crossed out)"
                    hint="Must be higher than the price, e.g. 199."
                    value={d.pricing.compareAtAmount ?? null}
                    onChange={(compareAtAmount) => setData({ pricing: { ...d.pricing, compareAtAmount } })}
                  />
                )}
                <Text label="Price note (optional)" placeholder="Fees depend on the plan" value={d.pricing.note} onChange={(note) => setData({ pricing: { ...d.pricing, note } })} />
              </>
            )}
            <div className="rounded-lg bg-neutral-50 p-3 text-sm">
              <span className="text-neutral-500">Preview: </span>
              <PricePreview pricing={d.pricing} />
            </div>
          </Card>
          <Card title="After enrolling" description="Sent in the confirmation email to everyone who enrols for this programme." className="lg:col-span-2">
            <Text
              label="WhatsApp group link"
              placeholder="https://chat.whatsapp.com/…"
              hint="Shown as a “Join the WhatsApp group” button in the email and after enrolling. Leave empty to use the general link from Enrol form & emails."
              value={d.enrolment?.whatsappGroupUrl ?? ""}
              onChange={(whatsappGroupUrl) => setData({ enrolment: { ...(d.enrolment ?? { emailNote: "" }), whatsappGroupUrl } })}
            />
            <Text
              label="Extra note in the confirmation email (optional)"
              multiline
              placeholder="e.g. The Zoom link will be shared in the WhatsApp group 1 hour before the session."
              value={d.enrolment?.emailNote ?? ""}
              onChange={(emailNote) => setData({ enrolment: { ...(d.enrolment ?? { whatsappGroupUrl: "" }), emailNote } })}
            />
          </Card>
          <Card title="Online payment (Razorpay)" description="Take payment on the enrol page before the enrolment is confirmed.">
            {d.pricing.model !== "paid" || !d.pricing.amount ? (
              <Notice>Set Pricing to Paid with a price to collect payment online.</Notice>
            ) : (
              <>
                <Toggle
                  label="Collect payment online"
                  hint="The enrol button becomes “Pay & enrol” and opens Razorpay (UPI, cards, netbanking, wallets). Emails are sent once payment succeeds."
                  checked={d.payment.collectOnline}
                  onChange={(collectOnline) => setData({ payment: { ...d.payment, collectOnline, provider: "razorpay" } })}
                />
                {!d.payment.collectOnline && (
                  <p className="text-sm text-neutral-500">Off: enrolments are recorded as “Payment pending”, and you collect the fee yourself and mark it paid in Enrolments.</p>
                )}
                {d.payment.collectOnline && d.pricing.currency === "USD" && (
                  <Notice>USD payments need international payments enabled on your Razorpay account.</Notice>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function PricePreview({ pricing }: { pricing: ProgrammeData["pricing"] }) {
  if (pricing.model === "free") return <Badge tone="green">Free</Badge>;
  if (pricing.model === "hidden") return <span className="text-neutral-500">no price shown</span>;
  if (pricing.amount == null) return <Badge tone="blue">{pricing.note || "Paid"}</Badge>;
  const strike = pricing.showCompareAt && pricing.compareAtAmount != null && pricing.compareAtAmount > pricing.amount;
  const off = strike ? Math.round((1 - pricing.amount / pricing.compareAtAmount!) * 100) : 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <strong className="text-base">{formatMoney(pricing.amount, pricing.currency)}</strong>
      {strike && <s className="text-neutral-400">{formatMoney(pricing.compareAtAmount!, pricing.currency)}</s>}
      {off > 0 && <Badge tone="green">{off}% off</Badge>}
    </span>
  );
}
