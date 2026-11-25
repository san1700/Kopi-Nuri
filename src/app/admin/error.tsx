"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-white dark:bg-kopi-dark-card rounded-2xl border border-red-200 dark:border-red-900/50 p-8 max-w-lg mx-auto mt-10 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        Terjadi Kesalahan Saat Memuat Halaman
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {error.message || "Gagal mengambil data dari server. Silakan coba lagi."}
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 bg-kopi-green hover:bg-kopi-green/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
      >
        <RotateCcw className="w-4 h-4" />
        Coba Lagi
      </button>
    </div>
  );
}

