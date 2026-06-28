"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Obligation } from "@/lib/types";

interface ObligationsListProps {
  items: Obligation[];
  locale: string;
}

export function ObligationsList({ items, locale }: ObligationsListProps) {
  const t = useTranslations("obligations");
  const router = useRouter();

  return (
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
          {items.map((o) => (
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
  );
}
