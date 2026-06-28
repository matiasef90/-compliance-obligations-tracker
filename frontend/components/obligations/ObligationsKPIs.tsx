import { useTranslations } from "next-intl";
import type { ObligationStats } from "@/lib/types";
import { StatusCycleCard } from "./StatusCycleCard";

interface ObligationsKPIsProps {
  stats: ObligationStats;
}

type Variant = "default" | "danger" | "warning";

const variantClasses: Record<Variant, { card: string; value: string; label: string }> = {
  default: { card: "bg-white border-gray-100",     value: "text-gray-900",  label: "text-gray-500"  },
  danger:  { card: "bg-red-50 border-red-100",     value: "text-red-700",   label: "text-red-500"   },
  warning: { card: "bg-amber-50 border-amber-100", value: "text-amber-700", label: "text-amber-600" },
};

function KPICard({ label, value, variant = "default" }: { label: string; value: number; variant?: Variant }) {
  const cls = variantClasses[variant];
  return (
    <div className={`rounded-xl border px-4 py-3 ${cls.card}`}>
      <p className={`text-2xl font-bold tabular-nums ${cls.value}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${cls.label}`}>{label}</p>
    </div>
  );
}

export function ObligationsKPIs({ stats }: ObligationsKPIsProps) {
  const t = useTranslations("obligations.kpi");

  const statuses = [
    { label: t("pending"),     value: stats.by_status.pending     ?? 0, variant: "neutral" as const },
    { label: t("in_progress"), value: stats.by_status.in_progress ?? 0, variant: "info"    as const },
    { label: t("submitted"),   value: stats.by_status.submitted   ?? 0, variant: "purple"  as const },
    { label: t("done"),        value: stats.by_status.done        ?? 0, variant: "success" as const },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      <KPICard label={t("total")}    value={stats.total} />
      <KPICard label={t("overdue")}  value={stats.overdue}         variant="danger" />
      <KPICard label={t("upcoming")} value={stats.upcoming_7_days} variant="warning" />
      <StatusCycleCard statuses={statuses} />
    </div>
  );
}
