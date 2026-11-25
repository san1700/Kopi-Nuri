"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gift,
  Plus,
  Edit,
  Power,
  Trash2,
  RefreshCw,
  Loader2,
  Coins,
  Package,
  CheckCircle2,
} from "lucide-react";
import {
  getRewardsList,
  toggleRewardActive,
  deleteReward,
} from "@/app/actions/reward";
import { RewardFormModal } from "@/components/reward-form-modal";
import { toast } from "sonner";

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  stock: number | null;
  isActive: boolean;
  createdAt: Date | string;
  redemptionCount: number;
}

export default function AdminRewardPage() {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    let isMounted = true;
    getRewardsList(false)
      .then((data) => {
        if (isMounted) {
          setRewards(data as RewardItem[]);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Gagal memuat katalog reward";
          toast.error(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  async function handleToggle(reward: RewardItem) {
    setActionId(reward.id);
    try {
      const res = await toggleRewardActive(reward.id);
      toast.success(
        `Reward "${reward.name}" berhasil ${res.isActive ? "diaktifkan" : "dinonaktifkan"}`
      );
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status reward");
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(reward: RewardItem) {
    if (!confirm(`Hapus permanen reward "${reward.name}"?`)) return;
    setActionId(reward.id);
    try {
      await deleteReward(reward.id);
      toast.success(`Reward "${reward.name}" berhasil dihapus`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus reward");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gift className="text-kopi-green dark:text-kopi-olive" />
            Katalog Reward &amp; Voucher
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola produk yang dapat ditukar dengan poin loyalty member Kopi Nuri
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-kopi-dark-card border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
          <button
            onClick={() => {
              setEditingReward(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-kopi-green hover:bg-kopi-green/90 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors"
          >
            <Plus size={18} />
            Tambah Reward Baru
          </button>
        </div>
      </div>

      {/* Grid Katalog Reward */}
      {loading ? (
        <div className="p-16 text-center text-gray-500 bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800">
          <Loader2 size={32} className="animate-spin mx-auto mb-2 text-kopi-green" />
          Memuat katalog reward...
        </div>
      ) : rewards.length === 0 ? (
        <div className="p-16 text-center text-gray-500 bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800">
          <Gift size={40} className="mx-auto mb-2 text-gray-400" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">Belum Ada Reward</p>
          <p className="text-xs text-gray-500 mt-1">
            Klik tombol &quot;Tambah Reward Baru&quot; di atas untuk menambahkan produk ke katalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map((r) => (
            <div
              key={r.id}
              className={`bg-white dark:bg-kopi-dark-card rounded-2xl p-5 border shadow-xs transition-all relative flex flex-col justify-between ${
                r.isActive
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-gray-200/60 dark:border-gray-800/40 opacity-70"
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-kopi-green/10 text-kopi-green dark:text-kopi-olive flex items-center justify-center shrink-0">
                    <Gift size={22} />
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                      r.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300"
                    }`}
                  >
                    {r.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                {/* Nama & Deskripsi */}
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-snug">
                  {r.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                  {r.description || "Tidak ada deskripsi"}
                </p>

                {/* Poin & Stok Info */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-kopi-green dark:text-kopi-olive-light font-extrabold text-lg">
                    <Coins size={18} />
                    <span>{r.pointsCost}</span>
                    <span className="text-xs font-semibold text-gray-400">pts</span>
                  </div>

                  <div className="text-right">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Package size={13} />
                      {r.stock !== null ? (
                        r.stock > 0 ? (
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            Stok: {r.stock}
                          </span>
                        ) : (
                          <span className="font-semibold text-kopi-coral">Habis</span>
                        )
                      ) : (
                        <span className="text-gray-400">Tak Terbatas</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span>Ditukar: {r.redemptionCount} kali</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button
                  onClick={() => handleToggle(r)}
                  disabled={actionId === r.id}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                    r.isActive
                      ? "text-gray-500 hover:text-kopi-coral hover:bg-red-50 dark:hover:bg-red-950/40"
                      : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  }`}
                  title={r.isActive ? "Nonaktifkan Reward" : "Aktifkan Reward"}
                >
                  <Power size={14} />
                  {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingReward(r);
                      setFormModalOpen(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Edit Reward"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={actionId === r.id}
                    className="p-1.5 text-gray-400 hover:text-kopi-coral hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Hapus Reward"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit Reward */}
      {formModalOpen && (
        <RewardFormModal
          initialData={editingReward}
          onClose={() => {
            setFormModalOpen(false);
            setEditingReward(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
