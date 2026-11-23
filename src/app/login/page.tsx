"use client";

import { useState, type FormEvent } from "react";
import { api, errorText, json } from "@/lib/api";
import type { User } from "@/lib/types";
import { Button, Notice, Text } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("denied")
      ? "That account does not have admin access."
      : "",
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api<{ user?: User }>("/auth/login", json("POST", { email, password }));
      if (res.user?.role?.toLowerCase() !== "admin") {
        await api("/auth/logout", json("POST")).catch(() => {});
        setError("That account does not have admin access.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold">Edutou admin</h1>
            <p className="text-sm text-neutral-500">Sign in to manage edutou.in</p>
          </div>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <Text label="Email" type="email" value={email} onChange={setEmail} />
        <Text label="Password" type="password" value={password} onChange={setPassword} />
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
