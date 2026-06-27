"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Obligation, ObligationStatus } from "@/lib/types";

const STATUSES = ["all", "pending", "in_progress", "submitted", "done"] as const;

interface ObligationsListProps {
  obligations: Obligation[];
  locale: string;
}

export function ObligationsList({ obligations, locale }: ObligationsListProps) {
  const t = useTranslations("obligations");
  const router = useRouter();
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | ObligationStatus)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`filter.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">{t("empty")}</p>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-[35%]">{t("columns.title")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("columns.type")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("columns.owner")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("columns.dueDate")}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => router.push(`/${locale}/obligations/${o.id}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{o.title}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t(`type_labels.${o.type}`)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.owner}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{o.due_date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge status={o.status} label={t(`status.${o.status}`)} />
                      {o.overdue && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          {t("overdue")}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
