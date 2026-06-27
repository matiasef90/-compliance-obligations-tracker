"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

const locales = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
];

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex gap-1">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            locale === l.code
              ? "bg-accent text-white"
              : "text-sidebar-text hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
