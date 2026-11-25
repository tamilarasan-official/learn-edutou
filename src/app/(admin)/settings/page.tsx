"use client";

import { useEffect, useState } from "react";
import { api, errorText, json, SITE_URL } from "@/lib/api";
import { formatMoney, type EmailServerStatus, type EnrolForm, type Notifications, type PaymentsStatus } from "@/lib/types";
import { PageHeader, useAdmin } from "@/components/AdminShell";
import { Badge, Button, Card, inputClass, Notice, Spinner, StringList, Text, Toggle } from "@/components/ui";

export default function EnrolFormSettings() {
  const { user } = useAdmin();
  const [form, setForm] = useState<EnrolForm | null>(null);
  const [notify, setNotify] = useState<Notifications | null>(null);
  const [saved, setSaved] = useState("");
  const [mail, setMail] = useState<EmailServerStatus | null>(null);
  const [pay, setPay] = useState<PaymentsStatus | null>(null);
  const [testTo, setTestTo] = useState(user.email);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const snapshot = (f: EnrolForm | null, n: Notifications | null) => JSON.stringify([f, n]);

  useEffect(() => {
    Promise.all([
      api<{ data: EnrolForm }>("/api/cms/admin/settings/enrol_form"),
      api<{ data: Notifications }>("/api/cms/admin/settings/notifications"),
      api<{ data: EmailServerStatus }>("/api/cms/admin/email/status"),
      api<{ data: PaymentsStatus }>("/api/cms/admin/payments/status").catch(() => null),
    ])
      .then(([f, n, m, p]) => {
        if (p) setPay(p.data);
        setForm(f.data);
        setNotify(n.data);
        setMail(m.data);
        setSaved(snapshot(f.data, n.data));
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  if (!form || !notify) return error ? <Notice tone="error">{error}</Notice> : <Spinner />;
  const set = (patch: Partial<EnrolForm>) => setForm({ ...form, ...patch });
  const setN = (patch: Partial<Notifications>) => setNotify({ ...notify, ...patch });
  const dirty = snapshot(form, notify) !== saved;

  const save = async () => {
    setError("");
    setNotice("");
    try {
      const [f, n] = await Promise.all([
        api<{ data: EnrolForm }>("/api/cms/admin/settings/enrol_form", json("PUT", { ...form, professions: form.professions.map((p) => p.trim()).filter(Boolean) })),
        api<{ data: Notifications }>("/api/cms/admin/settings/notifications", json("PUT", { ...notify, teamEmails: notify.teamEmails.map((e) => e.trim()).filter(Boolean) })),
      ]);
      setForm(f.data);
      setNotify(n.data);
      setSaved(snapshot(f.data, n.data));
      setNotice("Saved. New enrolments use it straight away.");
    } catch (e) {
      setError(errorText(e));
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setError("");
    setNotice("");
    try {
      await api("/api/cms/admin/email/test", json("POST", { to: testTo }));
      setNotice(`Test email sent to ${testTo}. Check the inbox (and spam folder).`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Enrol form & emails"
        description={<>The form on <a href={`${SITE_URL}/enroll`} target="_blank" rel="noreferrer" className="underline">{SITE_URL.replace(/^https?:\/\//, "")}/enroll</a> and the emails sent for every enrolment.</>}
        actions={<Button disabled={!dirty} onClick={save}>Save changes</Button>}
      />
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice tone="success">{notice}</Notice></div>}

      <Card
        title="Payments (Razorpay)"
        className="mb-6"
        actions={
          pay && (
            <Badge tone={!pay.configured ? "amber" : pay.mode === "live" ? "green" : "blue"}>
              {!pay.configured ? "Not set up" : pay.mode === "live" ? "Live" : "Test mode"}
            </Badge>
          )
        }
      >
        {!pay ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : !pay.configured ? (
          <Notice>Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the API&apos;s environment in Dokploy and redeploy it.</Notice>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              Key <code className="rounded bg-neutral-100 px-1">{pay.keyId}</code>
              {pay.mode === "test" && <> · test mode: no real money moves; use Razorpay&apos;s test cards or UPI</>}
            </p>
            {pay.totals.length > 0 && (
              <p className="text-sm text-neutral-600">
                Collected:{" "}
                {pay.totals.map((t) => `${formatMoney(Number(t.amount), t.currency)} from ${t.paid} enrolment${t.paid === 1 ? "" : "s"}`).join(" · ")}
              </p>
            )}
            {pay.webhookConfigured ? (
              <p className="text-sm text-green-700">Webhook secret set ✓</p>
            ) : (
              <Notice>
                Recommended: in the Razorpay dashboard → Settings → Webhooks, add <code className="break-all">{pay.webhookUrl}</code> with events
                payment.captured, order.paid and payment.failed, then put its secret in RAZORPAY_WEBHOOK_SECRET. It confirms payments even if
                someone closes the page right after paying.
              </Notice>
            )}
          </>
        )}
      </Card>

      <Card
        title="Email server"
        className="mb-6"
        actions={mail && <Badge tone={mail.configured ? "green" : "amber"}>{mail.configured ? "Connected" : "Not set up"}</Badge>}
      >
        {mail?.configured ? (
          <>
            <p className="text-sm text-neutral-600">
              Sending as <strong>{mail.from}</strong> · {mail.sent_today} sent in the last 24 hours
              {mail.pending > 0 && <> · {mail.pending} waiting</>}
              {mail.failed > 0 && <> · <span className="text-red-600">{mail.failed} failed</span></>}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} className={inputClass} placeholder="Send a test to…" aria-label="Test email address" />
              <Button variant="secondary" disabled={testing || !testTo} onClick={sendTest} className="shrink-0">
                {testing ? "Sending…" : "Send test email"}
              </Button>
            </div>
          </>
        ) : (
          <Notice>
            Emails are being saved but not sent yet. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM to the API&apos;s environment in Dokploy and redeploy it.
          </Notice>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Confirmation email" description="Sent to the person who enrolled, with the programme details and its WhatsApp group link.">
          <Toggle label="Send confirmation emails" checked={notify.sendConfirmation} onChange={(sendConfirmation) => setN({ sendConfirmation })} />
          <Text label="Subject" hint="{name} and {programme} are filled in automatically." value={notify.confirmationSubject} onChange={(confirmationSubject) => setN({ confirmationSubject })} />
          <Text label="Message" multiline rows={4} value={notify.confirmationIntro} onChange={(confirmationIntro) => setN({ confirmationIntro })} />
          <Text label="Sign-off" value={notify.confirmationSignoff} onChange={(confirmationSignoff) => setN({ confirmationSignoff })} />
        </Card>

        <Card title="Team notification" description="Every enrolment is emailed to these addresses.">
          <Toggle label="Notify the team" checked={notify.sendTeam} onChange={(sendTeam) => setN({ sendTeam })} />
          <StringList items={notify.teamEmails} onChange={(teamEmails) => setN({ teamEmails })} addLabel="Add email" placeholder="name@edutou.in" />
        </Card>

        <Card title="WhatsApp message" description="Pre-filled text for the “Send WhatsApp” button on each enrolment.">
          <Text label="Message" multiline rows={4} hint="{name}, {programme} and {whatsapp} (the group link) are filled in automatically." value={notify.whatsappMessage} onChange={(whatsappMessage) => setN({ whatsappMessage })} />
        </Card>

        <Card title="Form">
          <Text label="Heading" value={form.title} onChange={(title) => set({ title })} />
          <Text label="Intro" multiline value={form.intro} onChange={(intro) => set({ intro })} />
          <StringList label="Profession options" items={form.professions} onChange={(professions) => set({ professions })} addLabel="Add option" />
          <Text label="Button text" value={form.buttonText} onChange={(buttonText) => set({ buttonText })} />
          <Text label="Privacy note" value={form.privacyNote} onChange={(privacyNote) => set({ privacyNote })} />
        </Card>

        <Card title="After enrolling (on the website)">
          <Text label="Success heading" value={form.successTitle} onChange={(successTitle) => set({ successTitle })} />
          <Text label="Success message" multiline value={form.successMessage} onChange={(successMessage) => set({ successMessage })} />
          <Text
            label="General WhatsApp group link"
            placeholder="https://chat.whatsapp.com/…"
            hint="Used when a programme has no WhatsApp group link of its own."
            value={form.whatsappGroupUrl}
            onChange={(whatsappGroupUrl) => set({ whatsappGroupUrl })}
          />
        </Card>
      </div>
    </>
  );
}
