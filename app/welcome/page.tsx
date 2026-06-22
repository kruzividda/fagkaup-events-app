"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        if (typeof window !== "undefined") {
          const qs = new URLSearchParams(window.location.search);
          const token_hash = qs.get("token_hash");
          const type = qs.get("type");

          if (token_hash && type) {
            // Deterministísk staðfesting — setur session beint, óháð Supabase-redirect.
            await supabase.auth.verifyOtp({ token_hash, type: type as EmailOtpType });
            window.history.replaceState(null, "", window.location.pathname);
          } else if (window.location.hash.includes("access_token")) {
            // Varaleið: token í hash.
            const hp = new URLSearchParams(window.location.hash.slice(1));
            const access_token = hp.get("access_token");
            const refresh_token = hp.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
              window.history.replaceState(null, "", window.location.pathname);
            }
          }
        }
      } catch {
        /* höldum áfram og athugum session */
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      setChecking(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setErr(null);
    if (password.length < 8) return setErr("Lykilorð þarf að vera að minnsta kosti 8 stafir.");
    if (password !== confirm) return setErr("Lykilorðin stemma ekki.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr("Tókst ekki að vista lykilorð. Reyndu aftur.");
    router.push("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-5">
        <p className="text-sm text-muted">Augnablik…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="fk-rise w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fagkaup-logo-white.png" alt="Fagkaup" className="mb-3 h-10 w-auto" />
          <h1 className="font-display text-2xl font-semibold text-text">Velkomin!</h1>
          <p className="mt-2 text-sm text-muted">
            {email ? <>Settu lykilorð fyrir {email} til að ljúka aðgangi.</> : "Settu lykilorð til að ljúka aðgangi."}
          </p>
        </div>

        <div className="space-y-3">
          {err && <p className="rounded-lg border border-danger bg-[rgba(229,103,91,0.08)] px-3 py-2 text-sm text-danger">{err}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nýtt lykilorð"
            className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Staðfesta lykilorð"
            className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Vista…" : "Vista lykilorð og halda áfram"}
          </button>
        </div>
      </div>
    </main>
  );
}
