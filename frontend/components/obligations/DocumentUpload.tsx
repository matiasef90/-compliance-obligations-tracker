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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
    setError(null);
  }

  function handleUpload() {
    if (!selectedFile) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    startTransition(async () => {
      const result = await uploadDocument(locale, id, formData);
      if (result.error) {
        setError(t("errors.GENERIC"));
      } else {
        setShowInput(false);
        setSelectedFile(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="col-span-2">
      <dt className="text-gray-500 font-medium">{t("documentUrl")}</dt>
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
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => setShowInput(true)}
                className="text-xs px-2 py-1"
              >
                {t("replaceDocument")}
              </Button>
            )}
          </div>
        )}
        {showInput && (
          <div className="flex flex-col gap-2">
            <label className={`
              flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors
              ${selectedFile
                ? "border-accent bg-accent/5 text-accent"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"}
              ${isPending ? "opacity-50 cursor-not-allowed" : ""}
            `}>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm truncate">
                {selectedFile ? selectedFile.name : t("chooseFile")}
              </span>
              <input
                ref={fileRef}
                type="file"
                disabled={isPending}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <Button
              variant="primary"
              disabled={!selectedFile || isPending}
              onClick={handleUpload}
            >
              {isPending ? t("uploading") : t("uploadDocument")}
            </Button>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </dd>
    </div>
  );
}
