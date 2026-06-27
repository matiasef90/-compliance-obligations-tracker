import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { fetchObligations } from "@/lib/api";
import { ObligationCard } from "@/components/obligations/ObligationCard";
import { StatusFilter } from "@/components/obligations/StatusFilter";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: { locale: string };
  searchParams: { status?: string };
}

export default async function ObligationsPage({ params, searchParams }: PageProps) {
  const { locale } = params;
  const obligations = await fetchObligations(searchParams.status);
  const t = await getTranslations({ locale, namespace: "obligations" });

  return (
    <div>
      <Topbar title={t("title")} locale={locale} showNewButton />
      <div className="p-6">
        <div className="mb-5">
          <Suspense>
            <StatusFilter />
          </Suspense>
        </div>
        {obligations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">{t("empty")}</p>
        ) : (
          <div className="grid gap-3">
            {obligations.map((o) => (
              <ObligationCard key={o.id} obligation={o} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
