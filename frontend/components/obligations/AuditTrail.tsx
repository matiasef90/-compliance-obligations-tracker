import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

interface AuditTrailProps {
  entries: AuditEntry[];
  createdAt: string;
  locale: string;
}

export function AuditTrail({ entries, createdAt, locale }: AuditTrailProps) {
  const t = useTranslations("detail");
  const tStatus = useTranslations("obligations.status");

  // Build ordered list of states: initial + each transition target
  const initialStatus = entries.length > 0 ? entries[0].from_status : null;
  const steps: { status: string; date: string }[] = [];

  if (initialStatus) {
    steps.push({ status: initialStatus, date: createdAt });
    for (const entry of entries) {
      steps.push({ status: entry.to_status, date: entry.changed_at });
    }
  }

  if (steps.length === 0) {
    return <p className="text-sm text-gray-400">{t("none")}</p>;
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          {/* Spine */}
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0 mt-1" />
            {i < steps.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 my-1 min-h-[1.5rem]" />
            )}
          </div>

          {/* Row */}
          <div className="flex items-start justify-between w-full pb-3 gap-4">
            <Badge status={step.status} label={tStatus(step.status)} />
            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
              {formatDateTime(step.date, locale)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
