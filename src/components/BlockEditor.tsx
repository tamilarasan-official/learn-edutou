"use client";

import type { Block, BlockType } from "@/lib/types";
import { Button, Card, ImageInput, ObjectList, Select, StringList, Text, Toggle } from "./ui";

export const BLOCK_TYPES: { type: BlockType; name: string; help: string }[] = [
  { type: "text_media", name: "Text with photo", help: "Paragraphs beside a photo, with an optional stat (e.g. “Why this track”)." },
  { type: "cards", name: "Card grid", help: "Numbered or plain cards: roles, modules, projects, partners, outcomes…" },
  { type: "split_list", name: "Text + checklist", help: "A paragraph with a note, beside a checklist (e.g. “Who it’s for”)." },
  { type: "tag_groups", name: "Tag groups", help: "Grouped tags (e.g. “Your toolkit”)." },
  { type: "plans", name: "Plans & roadmap", help: "Plans with bars, ways to join, and roadmap steps." },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: BlockType): Block {
  const base = { id: `${type}-${uid()}`, label: "", title: "", lead: "" };
  switch (type) {
    case "text_media":
      return { ...base, type, paragraphs: [""], stat: { prefix: "", value: "", label: "", source: "" }, image: { url: "", alt: "", focus: "" } };
    case "cards":
      return { ...base, type, columns: 3, numbered: true, numberPrefix: "", items: [{ title: "", desc: "" }], buttons: [] };
    case "split_list":
      return { ...base, type, body: "", noteLabel: "", note: "", listTitle: "", list: [""] };
    case "tag_groups":
      return { ...base, type, groups: [{ name: "", items: [""] }] };
    case "plans":
      return { ...base, type, plansTitle: "", plans: [], modesTitle: "", modes: [], stepsTitle: "", steps: [] };
  }
}

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch } as Block);
  switch (block.type) {
    case "text_media":
      return (
        <>
          <StringList label="Paragraphs" items={block.paragraphs} onChange={(paragraphs) => set({ paragraphs })} addLabel="Add paragraph" />
          <div className="grid gap-3 sm:grid-cols-4">
            <Text label="Stat prefix" value={block.stat.prefix} onChange={(prefix) => set({ stat: { ...block.stat, prefix } })} />
            <Text label="Stat value" placeholder="73%" value={block.stat.value} onChange={(value) => set({ stat: { ...block.stat, value } })} />
            <Text label="Stat text" value={block.stat.label} onChange={(label) => set({ stat: { ...block.stat, label } })} className="sm:col-span-2" />
          </div>
          <Text label="Stat source" value={block.stat.source} onChange={(source) => set({ stat: { ...block.stat, source } })} hint="Leave the stat value empty to hide the stat card." />
          <ImageInput label="Photo" value={block.image.url} onChange={(url) => set({ image: { ...block.image, url } })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Photo description (alt text)" value={block.image.alt} onChange={(alt) => set({ image: { ...block.image, alt } })} />
            <Text label="Photo focus" placeholder="50% 50%" hint="Which part stays visible when cropped." value={block.image.focus} onChange={(focus) => set({ image: { ...block.image, focus } })} />
          </div>
        </>
      );
    case "cards":
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Columns" value={String(block.columns) as "2" | "3" | "4"} onChange={(v) => set({ columns: Number(v) as 2 | 3 | 4 })} options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]} />
            <Text label="Number prefix" placeholder="Role " value={block.numberPrefix} onChange={(numberPrefix) => set({ numberPrefix })} />
            <div className="pt-6"><Toggle label="Numbered" checked={block.numbered} onChange={(numbered) => set({ numbered })} /></div>
          </div>
          <ObjectList label="Cards" items={block.items} onChange={(items) => set({ items })} blank={{ title: "", desc: "" }} addLabel="Add card" fields={[{ key: "title", label: "Title" }, { key: "desc", label: "Description", multiline: true }]} />
          <ObjectList label="Buttons" hint="Links: /path on the site, https://…, mailto: or tel:" items={block.buttons} onChange={(buttons) => set({ buttons })} blank={{ label: "", href: "" }} addLabel="Add button" fields={[{ key: "label", label: "Label" }, { key: "href", label: "Link" }]} />
        </>
      );
    case "split_list":
      return (
        <>
          <Text label="Body" multiline value={block.body} onChange={(body) => set({ body })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Note label" placeholder="Helpful, not required" value={block.noteLabel} onChange={(noteLabel) => set({ noteLabel })} />
            <Text label="Note" value={block.note} onChange={(note) => set({ note })} />
          </div>
          <Text label="Checklist title" value={block.listTitle} onChange={(listTitle) => set({ listTitle })} />
          <StringList label="Checklist" items={block.list} onChange={(list) => set({ list })} addLabel="Add item" />
        </>
      );
    case "tag_groups":
      return (
        <div className="space-y-3">
          {block.groups.map((g, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-end gap-2">
                <Text label="Group name" value={g.name} onChange={(name) => set({ groups: block.groups.map((x, j) => (j === i ? { ...x, name } : x)) })} className="flex-1" />
                <Button variant="danger" size="sm" onClick={() => set({ groups: block.groups.filter((_, j) => j !== i) })}>Remove group</Button>
              </div>
              <div className="mt-2">
                <StringList items={g.items} onChange={(items) => set({ groups: block.groups.map((x, j) => (j === i ? { ...x, items } : x)) })} addLabel="Add tag" />
              </div>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => set({ groups: [...block.groups, { name: "", items: [""] }] })}>+ Add group</Button>
        </div>
      );
    case "plans":
      return (
        <>
          <Text label="Plans title" value={block.plansTitle} onChange={(plansTitle) => set({ plansTitle })} />
          <ObjectList label="Plans" hint="Bar length is 0–100." items={block.plans} onChange={(plans) => set({ plans })} blank={{ name: "", desc: "", weight: 100 }} addLabel="Add plan" fields={[{ key: "name", label: "Name" }, { key: "desc", label: "Description" }, { key: "weight", label: "Bar length", number: true }]} />
          <Text label="Ways to join title" value={block.modesTitle} onChange={(modesTitle) => set({ modesTitle })} />
          <ObjectList items={block.modes} onChange={(modes) => set({ modes })} blank={{ title: "", desc: "" }} addLabel="Add way to join" fields={[{ key: "title", label: "Title" }, { key: "desc", label: "Description" }]} />
          <Text label="Roadmap title" value={block.stepsTitle} onChange={(stepsTitle) => set({ stepsTitle })} />
          <ObjectList items={block.steps} onChange={(steps) => set({ steps })} blank={{ title: "", desc: "" }} addLabel="Add step" fields={[{ key: "title", label: "Step" }, { key: "desc", label: "Description" }]} />
        </>
      );
  }
}

export default function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...blocks];
    const [b] = next.splice(i, 1);
    next.splice(i + d, 0, b!);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {blocks.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">No sections yet. Add one below.</p>}
      {blocks.map((b, i) => {
        const meta = BLOCK_TYPES.find((t) => t.type === b.type)!;
        return (
          <Card
            key={b.id}
            title={`${i + 1}. ${b.title || b.label || meta.name}`}
            description={meta.name}
            actions={
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move section up">↑</Button>
                <Button variant="ghost" size="sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move section down">↓</Button>
                <Button variant="danger" size="sm" onClick={() => window.confirm("Remove this section?") && onChange(blocks.filter((x) => x.id !== b.id))}>Remove</Button>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Small label above the heading" value={b.label} onChange={(label) => onChange(blocks.map((x) => (x.id === b.id ? ({ ...x, label } as Block) : x)))} />
              <Text label="Heading" value={b.title} onChange={(title) => onChange(blocks.map((x) => (x.id === b.id ? ({ ...x, title } as Block) : x)))} />
            </div>
            <Text label="Intro line" value={b.lead} onChange={(lead) => onChange(blocks.map((x) => (x.id === b.id ? ({ ...x, lead } as Block) : x)))} />
            <BlockFields block={b} onChange={(nb) => onChange(blocks.map((x) => (x.id === b.id ? nb : x)))} />
          </Card>
        );
      })}
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-neutral-700">Add a section</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCK_TYPES.map((t) => (
            <button key={t.type} type="button" onClick={() => onChange([...blocks, newBlock(t.type)])} className="rounded-lg border border-neutral-200 p-3 text-left hover:border-[#ff5e00]">
              <span className="block text-sm font-semibold">+ {t.name}</span>
              <span className="mt-0.5 block text-xs text-neutral-500">{t.help}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

