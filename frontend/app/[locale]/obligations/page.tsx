import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { fetchObligations, fetchObligationStats } from "@/lib/api";
import { ObligationsList } from "@/components/obligations/ObligationsList";
import { ObligationsKPIs } from "@/components/obligations/ObligationsKPIs";
import { ObligationsFilters } from "@/components/obligations/ObligationsFilters";
import { ObligationsPagination } from "@/components/obligations/ObligationsPagination";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}

export default async function ObligationsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { page: pageParam, status, search } = await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [stats, list, t] = await Promise.all([
    fetchObligationStats(),
    fetchObligations({ page, limit: 10, status, search }),
    getTranslations({ locale, namespace: "obligations" }),
  ]);

  return (
    <div>
      <Topbar title={t("title")} locale={locale} showNewButton />
      <div className="p-6 space-y-6">
        <ObligationsKPIs stats={stats} />
        <Suspense fallback={null}>
          <ObligationsFilters />
        </Suspense>
        {list.items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">{t("empty")}</p>
        ) : (
          <ObligationsList items={list.items} locale={locale} />
        )}
        {list.pages > 1 && (
          <Suspense fallback={null}>
            <ObligationsPagination page={list.page} pages={list.pages} total={list.total} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
