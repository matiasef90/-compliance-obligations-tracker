"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createObligation } from "@/actions/createObligation";
import { Button } from "@/components/ui/Button";

const TYPES = [
  "annual_report",
  "tax_filing",
  "audit",
  "regulatory_disclosure",
  "other",
] as const;

interface ObligationFormProps {
  locale: string;
}

const initialState = { error: undefined };

export function ObligationForm({ locale }: ObligationFormProps) {
  const t = useTranslations("form");
  const tTypes = useTranslations("obligations.type_labels");

  const boundAction = createObligation.bind(null, locale);
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("typeField")} <span className="text-red-500">*</span>
        </label>
        <select
          name="type"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {tTypes(type)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("descriptionField")}
        </label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("dueDateField")} <span className="text-red-500">*</span>
          </label>
          <input
            name="due_date"
            type="date"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("ownerField")} <span className="text-red-500">*</span>
          </label>
          <input
            name="owner"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("documentUrlField")}
        </label>
        <input
          name="document_url"
          type="url"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          name="requires_document"
          id="requires_document"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
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
