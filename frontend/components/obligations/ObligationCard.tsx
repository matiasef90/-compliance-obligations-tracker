import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Obligation } from "@/lib/types";

interface ObligationCardProps {
  obligation: Obligation;
  locale: string;
}

export function ObligationCard({ obligation, locale }: ObligationCardProps) {
  const t = useTranslations("obligations");

  return (
    <Link href={`/${locale}/obligations/${obligation.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{obligation.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t(`type_labels.${obligation.type}`)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {obligation.overdue && (
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {t("overdue")}
              </span>
            )}
            <Badge status={obligation.status} label={t(`status.${obligation.status}`)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span>{t("dueDate")}: {obligation.due_date}</span>
          <span>{t("owner")}: {obligation.owner}</span>
        </div>
      </div>
    </Link>
  );
}
