import { useTranslations } from "next-intl";
import { ObligationForm } from "@/components/obligations/ObligationForm";
import { Topbar } from "@/components/layout/Topbar";

interface PageProps {
  params: { locale: string };
}

export default function NewObligationPage({ params }: PageProps) {
  const { locale } = params;
  const t = useTranslations("form");

  return (
    <div>
      <Topbar title={t("title")} locale={locale} />
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <ObligationForm locale={locale} />
        </div>
      </div>
    </div>
  );
}
