"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Variant = "footer" | "block" | "hero";

export function NewsletterForm({ variant = "footer", source }: { variant?: Variant; source?: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errorKey, setErrorKey] = useState<"invalid" | "generic">("generic");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: source || variant }),
      });
      if (res.ok) {
        setStatus("ok");
        setEmail("");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setErrorKey(data?.error === "invalid_email" ? "invalid" : "generic");
      setStatus("error");
    } catch {
      setErrorKey("generic");
      setStatus("error");
    }
  }

  if (variant === "footer") {
    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <label htmlFor="newsletter-footer" className="text-sm font-semibold text-slate-300">
          {t("footerLabel")}
        </label>
        <p className="text-xs text-slate-500">{t("footerHint")}</p>
        <div className="flex gap-2 mt-1">
          <input
            id="newsletter-footer"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("placeholder")}
            disabled={status === "loading" || status === "ok"}
            className="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === "loading" || status === "ok"}
            className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "…" : t("subscribe")}
          </button>
        </div>
        <StatusLine status={status} errorKey={errorKey} t={t} />
        <p className="text-[11px] text-slate-600">
          {t("privacy")}{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
            {t("privacyLink")}
          </Link>
        </p>
      </form>
    );
  }

  // "block" (end of blog) and "hero" share a larger layout
  const isHero = variant === "hero";
  return (
    <div
      className={
        isHero
          ? "rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:p-10"
          : "mt-16 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] to-violet-500/[0.04] p-6 sm:p-8"
      }
    >
      <h3 className={isHero ? "text-2xl sm:text-3xl font-bold mb-2" : "text-xl font-bold mb-2"}>
        {t("blockTitle")}
      </h3>
      <p className="text-slate-400 text-sm mb-5">{t("blockSubtitle")}</p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          disabled={status === "loading" || status === "ok"}
          className="flex-1 min-w-0 px-4 py-3 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "ok"}
          className="px-6 py-3 rounded-md bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors disabled:opacity-60"
        >
          {status === "loading" ? "…" : t("subscribe")}
        </button>
      </form>
      <div className="mt-3">
        <StatusLine status={status} errorKey={errorKey} t={t} />
      </div>
      <p className="text-xs text-slate-500 mt-4">
        {t("privacy")}{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-white">
          {t("privacyLink")}
        </Link>
      </p>
    </div>
  );
}

function StatusLine({
  status,
  errorKey,
  t,
}: {
  status: "idle" | "loading" | "ok" | "error";
  errorKey: "invalid" | "generic";
  t: (key: string) => string;
}) {
  if (status === "ok") return <p className="text-xs text-emerald-400">{t("success")}</p>;
  if (status === "error") return <p className="text-xs text-red-400">{t(errorKey === "invalid" ? "errorInvalid" : "errorGeneric")}</p>;
  return null;
}
