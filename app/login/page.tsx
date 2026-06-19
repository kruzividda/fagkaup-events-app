"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  // useSearchParams krefst Suspense-marka í Next 14.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "forbidden"
      ? "Þú hefur ekki aðgang að þessu svæði."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Innskráning mistókst. Athugaðu netfang og lykilorð.");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="fk-rise w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(200,164,92,0.4)] bg-gradient-to-br from-[rgba(200,164,92,0.18)] to-transparent shadow-glow">
            <span className="font-display text-2xl font-semibold text-accent">F</span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Fagkaup</p>
          <h1 className="mt-1 font-display text-[34px] font-semibold leading-tight text-text">Events</h1>
          <p className="mt-2 text-sm text-muted">Innskráning fyrir starfsfólk</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-card">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />
          <div className="space-y-4">
            <Field label="Netfang" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field
              label="Lykilorð"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              onEnter={signIn}
            />

            {error && (
              <p className="rounded-xl border border-danger bg-[rgba(229,103,91,0.08)] px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              onClick={signIn}
              disabled={loading || !email || !password}
              className="mt-1 w-full rounded-xl bg-gradient-to-br from-accent to-accent-bright px-4 py-3.5 text-[15px] font-semibold text-[#0A111B] shadow-glow transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Skrái inn…" : "Skrá inn"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  onEnter,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full rounded-xl border border-border bg-elevated px-4 py-3 text-[15px] text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-[rgba(200,164,92,0.22)]"
      />
    </label>
  );
}
