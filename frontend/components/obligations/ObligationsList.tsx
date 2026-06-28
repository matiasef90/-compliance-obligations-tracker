"use client";

import { useState, useRef, useEffect } from "react";
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [status, setStatus] = useState<"all" | ObligationStatus>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = obligations
    .filter((o) => {
      const matchesStatus = status === "all" || o.status === status;
      const q = search.toLowerCase();
      const matchesSearch =
        q === "" ||
        o.title.toLowerCase().includes(q) ||
        o.owner.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${searchFocused ? "text-accent" : "text-gray-400"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <span className="flex-1 text-left">{t(`filter.${status}`)}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-100 bg-white shadow-sm z-10 overflow-hidden">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(s); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    status === s ? "bg-violet-50 text-accent font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t(`filter.${s}`)}
                </button>
              ))}
            </div>
          )}
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
                <tr
                  key={o.id}
                  onClick={() => router.push(`/${locale}/obligations/${o.id}`)}
                  className={`transition-colors cursor-pointer ${o.overdue ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}
                >
                  <td className={`px-4 py-3 font-medium ${o.overdue ? "text-red-900" : "text-gray-900"}`}>{o.title}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${o.overdue ? "text-red-700" : "text-gray-500"}`}>{t(`type_labels.${o.type}`)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${o.overdue ? "text-red-700" : "text-gray-500"}`}>{o.owner}</td>
                  <td className={`px-4 py-3 whitespace-nowrap font-medium ${o.overdue ? "text-red-700" : "text-gray-500"}`}>
                    {new Date(`${o.due_date}T00:00:00`).toLocaleDateString(locale)}
                  </td>
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
