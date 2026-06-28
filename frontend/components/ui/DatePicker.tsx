"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface DatePickerProps {
  name: string;
  required?: boolean;
  locale?: string;
  initialValue?: string;
  labels?: {
    placeholder?: string;
    clear?: string;
    today?: string;
  };
  className?: string;
}

export function DatePicker({
  name,
  required,
  locale = "default",
  initialValue,
  labels = {},
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (!initialValue) return;
    const [y, m, d] = initialValue.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    setSelected(date);
    setViewYear(y);
    setViewMonth(m - 1);
  }, [initialValue]);

  // Locale-aware weekday headers starting on Sunday (Jan 5 2025 = Sunday)
  const DAYS = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Date(2025, 0, 5 + i).toLocaleString(locale, { weekday: "short" })
      ),
    [locale]
  );

  // Capitalize only first letter to avoid "Enero De 2027"
  function getMonthLabel(year: number, month: number) {
    const raw = new Date(year, month, 1).toLocaleString(locale, {
      month: "long",
      year: "numeric",
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  // Locale-aware numeric format: dd/mm/yyyy or mm/dd/yyyy depending on locale
  function formatDisplay(date: Date) {
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function toISODate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    setSelected(new Date(viewYear, viewMonth, day));
    setOpen(false);
  }

  function selectToday() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setSelected(t);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setOpen(false);
  }

  function handleToggle() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // Popover height ~320px; open upward if not enough space below
      setOpenUp(window.innerHeight - rect.bottom < 340);
    }
    setOpen((prev) => !prev);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <input
        type="hidden"
        name={name}
        value={selected ? toISODate(selected) : ""}
        required={required}
      />

      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      >
        <span className={`flex-1 text-left ${selected ? "text-gray-900" : "text-gray-400"}`}>
          {selected ? formatDisplay(selected) : (labels.placeholder ?? "Select date")}
        </span>
        <svg
          className="w-4 h-4 text-gray-400 shrink-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          } rounded-xl border border-gray-100 bg-white shadow-md z-20 p-3 w-72`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-900">
              {getMonthLabel(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium py-1 capitalize">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDayOfMonth(viewYear, viewMonth) }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth(viewYear, viewMonth) }).map((_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              const isSelected = selected?.toDateString() === date.toDateString();
              const isToday = today.toDateString() === date.toDateString();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors
                    ${isSelected
                      ? "bg-accent text-white font-medium"
                      : isToday
                        ? "text-accent font-medium hover:bg-violet-50"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setSelected(null); setOpen(false); }}
              className="text-xs text-accent hover:underline"
            >
              {labels.clear ?? "Clear"}
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="text-xs text-accent hover:underline"
            >
              {labels.today ?? "Today"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
