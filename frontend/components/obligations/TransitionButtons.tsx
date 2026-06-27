"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { transitionObligation } from "@/actions/transitionObligation";
import { Button } from "@/components/ui/Button";

interface TransitionButtonsProps {
  id: string;
  validTransitions: string[];
  version: number;
  locale: string;
}

export function TransitionButtons({ id, validTransitions, version, locale }: TransitionButtonsProps) {
  const t = useTranslations("detail.errors");
  const tTransitions = useTranslations("detail.transitions");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTransition(toStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await transitionObligation(locale, id, toStatus, version);
      if (result.error) {
        const msg = t(result.error as Parameters<typeof t>[0]) ?? result.error;
        setError(msg);
      }
    });
  }

  if (validTransitions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {validTransitions.map((status) => (
          <Button
            key={status}
            variant="primary"
            disabled={isPending}
            onClick={() => handleTransition(status)}
          >
            {tTransitions(status as Parameters<typeof tTransitions>[0])}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
