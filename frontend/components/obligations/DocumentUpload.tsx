"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadDocument } from "@/actions/uploadDocument";
import { Button } from "@/components/ui/Button";

interface DocumentUploadProps {
  id: string;
  locale: string;
  documentUrl: string | null;
}

export function DocumentUpload({ id, locale, documentUrl }: DocumentUploadProps) {
  const t = useTranslations("detail");
  const [showInput, setShowInput] = useState(!documentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDocument(locale, id, formData);
      if (result.error) {
        setError(t("errors.GENERIC"));
      } else {
        setShowInput(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="col-span-2">
      <dt className="text-gray-500 font-medium text-sm">{t("documentUrl")}</dt>
      <dd className="mt-1 space-y-2">
        {documentUrl && (
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline text-sm truncate"
            >
              {documentUrl}
            </a>
            {!showInput && (
              <button
                onClick={() => setShowInput(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline shrink-0"
              >
                {t("replaceDocument")}
              </button>
            )}
          </div>
        )}
        {showInput && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              disabled={isPending}
              className="text-sm text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-50"
            />
            <Button variant="secondary" disabled={isPending} onClick={handleUpload}>
              {isPending ? t("uploading") : t("uploadDocument")}
            </Button>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </dd>
    </div>
  );
}
