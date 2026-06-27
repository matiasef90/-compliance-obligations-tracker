"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const STATUSES = ["all", "pending", "in_progress", "submitted", "done"] as const;

export function StatusFilter() {
  const t = useTranslations("obligations.filter");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  function select(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => select(s)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            current === s
              ? "bg-accent text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:border-accent hover:text-accent"
          }`}
        >
          {t(s)}
        </button>
      ))}
    </div>
  );
}
