import { getTranslations } from "next-intl/server";
import { fetchObligations } from "@/lib/api";
import { ObligationsList } from "@/components/obligations/ObligationsList";
import { ObligationsKPIs } from "@/components/obligations/ObligationsKPIs";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ObligationsPage({ params }: PageProps) {
  const { locale } = await params;
  const [obligations, t] = await Promise.all([
    fetchObligations(),
    getTranslations({ locale, namespace: "obligations" }),
  ]);

  return (
    <div>
      <Topbar title={t("title")} locale={locale} showNewButton />
      <div className="p-6 space-y-6">
        <ObligationsKPIs obligations={obligations} />
        <ObligationsList obligations={obligations} locale={locale} />
      </div>
    </div>
  );
}
