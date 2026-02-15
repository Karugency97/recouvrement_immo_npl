"use client";

import { AlertCircle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Une erreur inattendue s&apos;est produite
          </h2>
          <p className="text-gray-500 mb-6 max-w-md">
            L&apos;application a rencontre un probleme. Veuillez rafraichir la page ou reessayer.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Reessayer
          </button>
        </div>
      </body>
    </html>
  );
}
