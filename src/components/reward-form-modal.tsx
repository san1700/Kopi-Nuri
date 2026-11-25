"use client";

import { useState } from "react";
import { X, Gift, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createReward, updateReward, RewardFormData } from "@/app/actions/reward";

interface RewardFormModalProps {
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    pointsCost: number;
    stock?: number | null;
    isActive: boolean;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RewardFormModal({
  initialData,
  onClose,
  onSuccess,
}: RewardFormModalProps) {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [pointsCostStr, setPointsCostStr] = useState(
    initialData?.pointsCost ? String(initialData.pointsCost) : "100"
  );
  const [hasStockLimit, setHasStockLimit] = useState(initialData?.stock !== null && initialData?.stock !== undefined);
  const [stockStr, setStockStr] = useState(
    initialData?.stock !== null && initialData?.stock !== undefined ? String(initialData.stock) : "50"
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const pointsCost = parseInt(pointsCostStr.replace(/\D/g, ""), 10) || 0;
    if (pointsCost <= 0) {
      setError("Biaya poin harus lebih dari 0");
      setLoading(false);
      return;
    }

    const stock = hasStockLimit ? parseInt(stockStr.replace(/\D/g, ""), 10) || 0 : null;

    try {
      const data: RewardFormData = {
        name: name.trim(),
        description: description.trim() || undefined,
        pointsCost,
        stock,
        isActive,
      };

      if (isEditing && initialData?.id) {
        await updateReward(initialData.id, data);
        toast.success(`Reward "${name}" berhasil diperbarui`);
      } else {
        await createReward(data);
        toast.success(`Reward baru "${name}" berhasil ditambahkan`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan reward";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Gift className="text-kopi-green dark:text-kopi-olive" size={20} />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {isEditing ? "Edit Katalog Reward" : "Tambah Reward Baru"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-kopi-coral bg-red-50 dark:bg-red-950/60 rounded-lg border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Nama Produk / Reward <span className="text-kopi-coral">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Es Kopi Susu Signature"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Kopi susu gula aren 250ml dingin/panas"
              rows={2}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Biaya Poin Penukaran <span className="text-kopi-coral">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={pointsCostStr}
                onChange={(e) => setPointsCostStr(e.target.value.replace(/\D/g, ""))}
                placeholder="100"
                required
                className="w-full pl-3.5 pr-14 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono font-bold focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-gray-400">
                Poin
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Minimal penukaran default adalah 100 poin.
            </p>
          </div>

          {/* Pengaturan Stok */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasStockLimit}
                onChange={(e) => setHasStockLimit(e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-kopi-green focus:ring-kopi-green"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Batasi stok reward (kuota terbatas)
              </span>
            </label>

            {hasStockLimit && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Jumlah Stok Tersedia:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={stockStr}
                  onChange={(e) => setStockStr(e.target.value.replace(/\D/g, ""))}
                  placeholder="50"
                  required
                  className="w-32 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-mono"
                />
              </div>
            )}
          </div>

          {/* Status Aktif */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-kopi-green focus:ring-kopi-green"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Status Aktif (dapat ditukar oleh member di kasir)
              </span>
            </label>
          </div>

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-kopi-green hover:bg-kopi-green/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? "Simpan Perubahan" : "Tambah Reward"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

