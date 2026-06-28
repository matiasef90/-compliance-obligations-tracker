"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ObligationsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <p className="text-sm text-gray-500">
        No se pudo cargar las obligaciones. Verifica la conexión con el servidor.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
