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
} from "lucide-react";
import {
  getRewardsList,
  toggleRewardActive,
  deleteReward,
} from "@/app/actions/reward";
import { RewardFormModal } from "@/components/reward-form-modal";
import { toast } from "sonner";
import {
  PageHeader,
  StatusPill,
  EmptyState,
} from "@/components/ui/kopi-ui";

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
    <div>
      <PageHeader
        title="Katalog reward &amp; voucher"
        subtitle="Kelola produk yang bisa ditukar dengan poin member."
        actions={
          <>
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "var(--sh)" }}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Segarkan
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingReward(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95"
            >
              <Plus size={17} />
              Tambah reward baru
            </button>
          </>
        }
      />

      {loading ? (
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-14 text-center text-[var(--mut)]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <Loader2 size={26} className="animate-spin mx-auto mb-2 text-[var(--brand)]" />
          Memuat katalog reward...
        </div>
      ) : rewards.length === 0 ? (
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6"
          style={{ boxShadow: "var(--sh)" }}
        >
          <EmptyState
            icon={<Gift size={24} />}
            title="Belum ada reward"
            description="Klik tombol “Tambah reward baru” untuk menambahkan produk ke katalog."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rewards.map((r) => (
            <div
              key={r.id}
              className={`bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] flex flex-col justify-between gap-4 transition-opacity ${
                r.isActive ? "" : "opacity-70"
              }`}
              style={{ boxShadow: "var(--sh)" }}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="w-9 h-9 rounded-[11px] bg-[var(--mint)] text-[var(--brand)] grid place-items-center">
                    <Gift size={18} />
                  </span>
                  <StatusPill variant={r.isActive ? "success" : "neutral"}>
                    {r.isActive ? "Aktif" : "Nonaktif"}
                  </StatusPill>
                </div>

                <h3 className="font-bold text-[15px] text-[var(--ink)] mt-3 leading-snug">
                  {r.name}
                </h3>
                {r.description && (
                  <p className="text-[12.5px] text-[var(--mut)] mt-1 line-clamp-2">
                    {r.description}
                  </p>
                )}

                <b className="block text-[20px] font-extrabold text-[var(--brand)] mt-2.5">
                  {r.pointsCost.toLocaleString("id-ID")} poin
                </b>

                <div className="text-[12.5px] text-[var(--mut)] mt-1 flex items-center gap-1.5">
                  <span>
                    {r.stock !== null
                      ? r.stock > 0
                        ? `Stok ${r.stock}`
                        : "Stok habis"
                      : "Stok tak terbatas"}
                  </span>
                  <span>·</span>
                  <span>Ditukar {r.redemptionCount}x</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(r)}
                  disabled={actionId === r.id}
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-[10px] cursor-pointer transition-colors ${
                    r.isActive
                      ? "text-[var(--mut)] hover:text-[var(--bad)] hover:bg-[var(--badbg)]"
                      : "text-[var(--brand)] hover:bg-[var(--mint)]"
                  }`}
                >
                  <Power size={14} />
                  {r.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReward(r);
                      setFormModalOpen(true);
                    }}
                    className="p-2 rounded-[10px] text-[var(--mut)] hover:text-[var(--ink)] hover:bg-[var(--bg)] cursor-pointer"
                    title="Edit Reward"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    disabled={actionId === r.id}
                    className="p-2 rounded-[10px] text-[var(--mut)] hover:text-[var(--bad)] hover:bg-[var(--badbg)] cursor-pointer"
                    title="Hapus Reward"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
