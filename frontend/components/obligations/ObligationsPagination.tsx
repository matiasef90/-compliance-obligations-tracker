"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface ObligationsPaginationProps {
  page: number;
  pages: number;
  total: number;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function ObligationsPagination({ page, pages, total }: ObligationsPaginationProps) {
  const t = useTranslations("obligations.pagination");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const pageNumbers = getPageNumbers(page, pages);

  return (
    <div className="flex items-center justify-between text-sm text-gray-500">
      <span>
        {t("pageOf", { page, pages })} · {t("results", { total })}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs"
        >
          {t("previous")}
        </button>
        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goToPage(p as number)}
              className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors ${
                p === page
                  ? "bg-accent text-white border-accent"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => goToPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
