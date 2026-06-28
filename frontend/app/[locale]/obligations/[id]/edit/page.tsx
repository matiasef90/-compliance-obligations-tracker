import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { fetchObligation } from "@/lib/api";
import { ObligationEditForm } from "@/components/obligations/ObligationEditForm";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditObligationPage({ params }: PageProps) {
  const { locale, id } = await params;

  let obligation;
  try {
    obligation = await fetchObligation(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("404")) notFound();
    throw err;
  }

  const t = await getTranslations({ locale, namespace: "form" });

  return (
    <div>
      <Topbar title={t("editTitle")} locale={locale} />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <ObligationEditForm obligation={obligation} locale={locale} />
        </div>
      </div>
    </div>
  );
}
