import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

interface SidebarProps {
  locale: string;
}

export function Sidebar({ locale }: SidebarProps) {
  const t = useTranslations("nav");

  return (
    <aside className="w-[220px] min-h-screen bg-sidebar flex flex-col fixed left-0 top-0">
      <div className="px-5 py-6 border-b border-white/10">
        <span className="text-white font-semibold text-base tracking-tight">
          Compliance Tracker
        </span>
      </div>

      <nav className="flex-1 px-3 py-4">
        <Link
          href={`/${locale}/obligations`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-text hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {t("obligations")}
        </Link>
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <LocaleSwitcher />
      </div>
    </aside>
  );
}
