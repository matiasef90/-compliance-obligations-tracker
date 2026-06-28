import { useTranslations } from "next-intl";
import type { Obligation } from "@/lib/types";
import { StatusCycleCard } from "./StatusCycleCard";

interface ObligationsKPIsProps {
  obligations: Obligation[];
}

const UPCOMING_DAYS = 7;

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

export function ObligationsKPIs({ obligations }: ObligationsKPIsProps) {
  const t = useTranslations("obligations.kpi");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingThreshold = new Date(today);
  upcomingThreshold.setDate(upcomingThreshold.getDate() + UPCOMING_DAYS);

  const overdue = obligations.filter((o) => o.overdue).length;
  const upcoming = obligations.filter((o) => {
    if (o.overdue || o.status === "done" || o.status === "submitted") return false;
    const due = new Date(`${o.due_date}T00:00:00`);
    return due >= today && due <= upcomingThreshold;
  }).length;

  const statuses = [
    { label: t("pending"),     value: obligations.filter((o) => o.status === "pending").length,     variant: "neutral" as const },
    { label: t("in_progress"), value: obligations.filter((o) => o.status === "in_progress").length, variant: "info"    as const },
    { label: t("submitted"),   value: obligations.filter((o) => o.status === "submitted").length,   variant: "purple"  as const },
    { label: t("done"),        value: obligations.filter((o) => o.status === "done").length,        variant: "success" as const },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      <KPICard label={t("total")}    value={obligations.length} />
      <KPICard label={t("overdue")}  value={overdue}            variant="danger" />
      <KPICard label={t("upcoming")} value={upcoming}           variant="warning" />
      <StatusCycleCard statuses={statuses} />
    </div>
  );
}
