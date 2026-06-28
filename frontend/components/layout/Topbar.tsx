import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface TopbarProps {
  title: string;
  locale: string;
  showNewButton?: boolean;
  editHref?: string;
}

export function Topbar({ title, locale, showNewButton = false, editHref }: TopbarProps) {
  const t = useTranslations("topbar");

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-2">
        {editHref && (
          <Link href={editHref}>
            <Button variant="secondary">{t("edit")}</Button>
          </Link>
        )}
        {showNewButton && (
          <Link href={`/${locale}/obligations/new`}>
            <Button variant="primary">{t("newObligation")}</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
