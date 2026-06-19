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
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Fagkaup
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-text">
            Events
          </h1>
          <p className="mt-2 text-sm text-muted">Innskráning fyrir starfsfólk</p>
        </div>

        <div className="space-y-3">
          <Field
            label="Netfang"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Lykilorð"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            onEnter={signIn}
          />

          {error && (
            <p className="rounded-lg border border-danger bg-surface px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            onClick={signIn}
            disabled={loading || !email || !password}
            className="mt-1 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B121C] transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Skrái inn…" : "Skrá inn"}
          </button>
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
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-accent"
      />
    </label>
  );
}
