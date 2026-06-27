"use client";

import { useState } from "react";
import Link from "next/link";
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
                <Link key={o.id} href={`/${locale}/obligations/${o.id}`} legacyBehavior={false}>
                  <tr className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 truncate block max-w-xs">{o.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t(`type_labels.${o.type}`)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{o.owner}</td>
                    <td className="px-4 py-3 text-gray-500">{o.due_date}</td>
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
                </Link>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
