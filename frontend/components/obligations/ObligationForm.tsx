"use client";

import { useActionState, useMemo, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createObligation } from "@/actions/createObligation";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";

const TYPES = [
  "annual_report",
  "tax_filing",
  "audit",
  "regulatory_disclosure",
  "other",
] as const;

type ObligationType = (typeof TYPES)[number];

interface ObligationFormProps {
  locale: string;
}

const initialState: { error?: string } = {};

export function ObligationForm({ locale }: ObligationFormProps) {
  const t = useTranslations("form");
  const tTypes = useTranslations("obligations.type_labels");
  const tDp = useTranslations("form.datePicker");

  const [typeOpen, setTypeOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ObligationType>(TYPES[0]);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) {
        setTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const boundAction = useMemo(() => createObligation.bind(null, locale), [locale]);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("titleField")} <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("typeField")} <span className="text-red-500">*</span>
        </label>
        <div ref={typeRef} className="relative">
          <input type="hidden" name="type" value={selectedType} />
          <button
            type="button"
            onClick={() => setTypeOpen((prev) => !prev)}
            className="flex items-center gap-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <span className="flex-1 text-left">{tTypes(selectedType)}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${typeOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {typeOpen && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl border border-gray-100 bg-white shadow-sm z-10 overflow-hidden">
              {TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setSelectedType(type); setTypeOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    selectedType === type ? "bg-violet-50 text-accent font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tTypes(type)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("descriptionField")}
        </label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("dueDateField")} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            name="due_date"
            required
            locale={locale}
            labels={{
              placeholder: tDp("placeholder"),
              clear: tDp("clear"),
              today: tDp("today"),
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("ownerField")} <span className="text-red-500">*</span>
          </label>
          <input
            name="owner"
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("taxIdField")} <span className="text-red-500">*</span>
        </label>
        <input
          name="company_tax_id"
          required
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("documentUrlField")}
        </label>
        <input
          name="document_url"
          type="url"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          name="requires_document"
          id="requires_document"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-200 accent-[#7c3aed] focus:ring-2 focus:ring-accent focus:ring-offset-0"
        />
        <label htmlFor="requires_document" className="text-sm text-gray-700">
          {t("requiresDocumentField")}
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : t("submit")}
        </Button>
      </div>
    </form>
  );
}
