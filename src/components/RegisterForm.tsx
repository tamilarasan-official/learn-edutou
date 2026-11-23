"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { LearnPageContent } from "@/lib/content";

type Errors = Partial<Record<"name" | "email" | "phone" | "profession" | "city" | "form", string>>;

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

const input =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3.5 text-[16px] text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15";

export default function RegisterForm({ form }: { form: LearnPageContent["form"] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const data: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((v, k) => (data[k] = String(v)));
    const params = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) data[key] = params.get(key) ?? "";

    setStatus("sending");
    setErrors({});
    try {
      const res = await fetch(`${API_URL}/api/learn/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("done");
        return;
      }
      setErrors(json.error?.errors ?? { form: json.error?.message ?? "Something went wrong. Please try again." });
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    }
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-neutral-900">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
        <h3 className="text-xl font-bold">{form.successTitle}</h3>
        <p className="mt-2 text-neutral-600">{form.successMessage}</p>
        {form.whatsappGroupUrl && (
          <a
            href={form.whatsappGroupUrl}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-5 py-3.5 font-semibold text-white"
          >
            Join the WhatsApp group
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <Field error={errors.name}>
        <input name="name" placeholder="Full Name" autoComplete="name" required className={input} aria-label="Full name" />
      </Field>

      <Field error={errors.email}>
        <input name="email" type="email" inputMode="email" placeholder="Email ID" autoComplete="email" required className={input} aria-label="Email" />
      </Field>

      <Field error={errors.phone}>
        <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white transition focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/15">
          <span className="flex shrink-0 items-center gap-1.5 border-r border-black/10 bg-neutral-50 px-3 text-[16px] font-medium text-neutral-700">
            <span aria-hidden="true">🇮🇳</span>+91
          </span>
          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            maxLength={14}
            placeholder="WhatsApp Number"
            autoComplete="tel-national"
            required
            className="w-full min-w-0 bg-transparent px-4 py-3.5 text-[16px] text-neutral-900 placeholder:text-neutral-400 outline-none"
            aria-label="WhatsApp number (India, +91)"
          />
        </div>
      </Field>

      <Field error={errors.profession}>
        <label className="mb-1.5 block text-sm font-medium text-white/90" htmlFor="profession">Select your profession</label>
        <select id="profession" name="profession" defaultValue="" required className={input}>
          <option value="" disabled>Choose one</option>
          {form.professions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </Field>

      <Field error={errors.city}>
        <input name="city" placeholder="City" autoComplete="address-level2" required className={input} aria-label="City" />
      </Field>

      {errors.form && <p className="rounded-lg bg-white/90 px-3 py-2 text-sm text-red-600">{errors.form}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-neutral-950 px-5 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-70"
      >
        {status === "sending" ? "Registering…" : form.buttonText}
      </button>
      {form.privacyNote && <p className="text-center text-xs text-white/85">{form.privacyNote}</p>}
    </form>
  );
}

function Field({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <div>
      {children}
      {error && <p className="mt-1 rounded bg-white/90 px-2 py-0.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
