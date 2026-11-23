"use client";

import { useEffect, useState } from "react";
import { api, errorText, json, SITE_URL } from "@/lib/api";
import type { EnrolForm } from "@/lib/types";
import { PageHeader } from "@/components/AdminShell";
import { Button, Card, Notice, Spinner, StringList, Text } from "@/components/ui";

export default function EnrolFormSettings() {
  const [form, setForm] = useState<EnrolForm | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api<{ data: EnrolForm }>("/api/cms/admin/settings/enrol_form")
      .then((r) => {
        setForm(r.data);
        setSaved(JSON.stringify(r.data));
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  if (!form) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;
  const set = (patch: Partial<EnrolForm>) => setForm({ ...form, ...patch });
  const dirty = JSON.stringify(form) !== saved;

  const save = async () => {
    setError("");
    setNotice("");
    try {
      const r = await api<{ data: EnrolForm }>("/api/cms/admin/settings/enrol_form", json("PUT", { ...form, professions: form.professions.map((p) => p.trim()).filter(Boolean) }));
      setForm(r.data);
      setSaved(JSON.stringify(r.data));
      setNotice("Saved. The enrol page uses it straight away.");
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Enrol form"
        description={<>Text and options on <a href={`${SITE_URL}/enroll`} target="_blank" rel="noreferrer" className="underline">{SITE_URL.replace(/^https?:\/\//, "")}/enroll</a>.</>}
        actions={<Button disabled={!dirty} onClick={save}>Save changes</Button>}
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Form">
          <Text label="Heading" value={form.title} onChange={(title) => set({ title })} />
          <Text label="Intro" multiline value={form.intro} onChange={(intro) => set({ intro })} />
          <StringList label="Profession options" items={form.professions} onChange={(professions) => set({ professions })} addLabel="Add option" />
          <Text label="Button text" value={form.buttonText} onChange={(buttonText) => set({ buttonText })} />
          <Text label="Privacy note" value={form.privacyNote} onChange={(privacyNote) => set({ privacyNote })} />
        </Card>
        <Card title="After enrolling">
          <Text label="Success heading" value={form.successTitle} onChange={(successTitle) => set({ successTitle })} />
          <Text label="Success message" multiline value={form.successMessage} onChange={(successMessage) => set({ successMessage })} />
          <Text label="WhatsApp group link (optional)" placeholder="https://chat.whatsapp.com/…" value={form.whatsappGroupUrl} onChange={(whatsappGroupUrl) => set({ whatsappGroupUrl })} />
        </Card>
      </div>
    </>
  );
}
