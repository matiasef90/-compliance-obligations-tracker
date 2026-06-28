"use client";

import { useActionState, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { updateObligation } from "@/actions/updateObligation";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import type { Obligation } from "@/lib/types";

interface ObligationEditFormProps {
  obligation: Obligation;
  locale: string;
}

const initialState: { error?: string } = {};

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent";

export function ObligationEditForm({ obligation, locale }: ObligationEditFormProps) {
  const t = useTranslations("form");
  const tDetail = useTranslations("detail");
  const tObl = useTranslations("obligations");
  const tDp = useTranslations("form.datePicker");

  const boundAction = useMemo(
    () => updateObligation.bind(null, locale, obligation.id),
    [locale, obligation.id]
  );
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const errorKey =
    state?.error === "CONFLICT"
      ? "errors.CONFLICT"
      : state?.error
        ? "errors.GENERIC"
        : null;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="version" value={obligation.version} />

      {errorKey && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {tDetail(errorKey)}
        </div>
      )}

      {/* Read-only fields */}
      <dl className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-100">
        <div>
          <dt className="text-gray-500 font-medium mb-0.5">{tObl("type")}</dt>
          <dd className="text-gray-900">{tObl(`type_labels.${obligation.type}`)}</dd>
        </div>
        <div>
          <dt className="text-gray-500 font-medium mb-0.5">{t("taxIdField")}</dt>
          <dd className="text-gray-900 font-mono">{obligation.company_tax_id}</dd>
        </div>
      </dl>

      {/* Editable fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("titleField")} <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          defaultValue={obligation.title}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("descriptionField")}
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={obligation.description ?? ""}
          className={`${INPUT_CLASS} resize-none`}
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
            initialValue={obligation.due_date}
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
            defaultValue={obligation.owner}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("documentUrlField")}
        </label>
        <input
          name="document_url"
          type="url"
          defaultValue={obligation.document_url ?? ""}
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          name="requires_document"
          id="requires_document"
          type="checkbox"
          defaultChecked={obligation.requires_document}
          className="h-4 w-4 rounded border-gray-200 accent-[#7c3aed] focus:ring-2 focus:ring-accent focus:ring-offset-0"
        />
        <label htmlFor="requires_document" className="text-sm text-gray-700">
          {t("requiresDocumentField")}
        </label>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "..." : tDetail("save")}
        </Button>
        <Link href={`/${locale}/obligations/${obligation.id}`}>
          <Button type="button" variant="secondary">{t("cancel")}</Button>
        </Link>
      </div>
    </form>
  );
}
