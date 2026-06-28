"use client";

import { useState, useEffect, useRef } from "react";

interface StatusEntry {
  label: string;
  value: number;
  variant: Variant;
}

type Variant = "neutral" | "info" | "purple" | "success";

const variantClasses: Record<Variant, { card: string; value: string; label: string; dot: string }> = {
  neutral: { card: "bg-white border-gray-100",       value: "text-gray-700",   label: "text-gray-500",   dot: "bg-gray-400"   },
  info:    { card: "bg-blue-50 border-blue-100",     value: "text-blue-700",   label: "text-blue-500",   dot: "bg-blue-500"   },
  purple:  { card: "bg-violet-50 border-violet-100", value: "text-violet-700", label: "text-violet-500", dot: "bg-violet-500" },
  success: { card: "bg-green-50 border-green-100",   value: "text-green-700",  label: "text-green-500",  dot: "bg-green-500"  },
};

const INTERVAL_MS = 2500;

export function StatusCycleCard({ statuses }: { statuses: StatusEntry[] }) {
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pinnedRef = useRef(false);

  useEffect(() => {
    pinnedRef.current = pinned;

    function tick() {
      if (pinnedRef.current) return;
      setIndex((i) => (i + 1) % statuses.length);
    }

    if (timerRef.current) clearInterval(timerRef.current);

    if (!pinned) {
      timerRef.current = setInterval(tick, INTERVAL_MS);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pinned, statuses.length]);

  function handleDot(i: number) {
    if (pinned && i === index) {
      setPinned(false);
    } else {
      setIndex(i);
      setPinned(true);
    }
  }

  const cls = variantClasses[statuses[index].variant];

  return (
    <div className={`rounded-xl border px-4 py-3 transition-colors duration-500 ${cls.card}`}>
      {/* Cross-fade content — pointer-events-none so dots below receive clicks */}
      <div className="relative h-12 pointer-events-none">
        {statuses.map((s, i) => {
          const c = variantClasses[s.variant];
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0"}`}
            >
              <p className={`text-2xl font-bold tabular-nums leading-tight ${c.value}`}>{s.value}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <p className={`text-xs ${c.label}`}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2 mt-3">
        {statuses.map((s, i) => {
          const c = variantClasses[s.variant];
          return (
            <button
              key={i}
              onClick={() => handleDot(i)}
              title={s.label}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? `w-4 h-1.5 ${c.dot}`
                  : "w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
