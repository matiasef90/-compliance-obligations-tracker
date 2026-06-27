import { useTranslations } from "next-intl";
import type { AuditEntry } from "@/lib/types";

interface AuditTrailProps {
  entries: AuditEntry[];
  locale: string;
}

export function AuditTrail({ entries, locale }: AuditTrailProps) {
  const t = useTranslations("detail");

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">{t("none")}</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-500">{t("from")}</th>
            <th className="text-left px-4 py-2 font-medium text-gray-500">{t("to")}</th>
            <th className="text-left px-4 py-2 font-medium text-gray-500">{t("changedAt")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry, i) => (
            <tr key={i} className="bg-white">
              <td className="px-4 py-2 text-gray-700">{entry.from_status}</td>
              <td className="px-4 py-2 text-gray-700">{entry.to_status}</td>
              <td className="px-4 py-2 text-gray-500">
                {new Date(entry.changed_at).toLocaleString(locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
