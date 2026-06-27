"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ObligationCard } from "./ObligationCard";
import type { Obligation, ObligationStatus } from "@/lib/types";

const STATUSES = ["all", "pending", "in_progress", "submitted", "done"] as const;

interface ObligationsListProps {
  obligations: Obligation[];
  locale: string;
}

export function ObligationsList({ obligations, locale }: ObligationsListProps) {
  const t = useTranslations("obligations");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ObligationStatus>("all");

  const filtered = obligations.filter((o) => {
    const matchesStatus = status === "all" || o.status === status;
    const q = search.toLowerCase();
    const matchesSearch =
      q === "" ||
      o.title.toLowerCase().includes(q) ||
      o.owner.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                status === s
                  ? "bg-accent text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-accent hover:text-accent"
              }`}
            >
              {t(`filter.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">{t("empty")}</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <ObligationCard key={o.id} obligation={o} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
