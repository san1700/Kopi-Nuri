"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  X,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coins,
  UserCheck,
} from "lucide-react";
import { findMemberForCashier } from "@/app/actions/transaction";
import { adjustMemberPoints } from "@/app/actions/adjust";
import { toast } from "sonner";

interface AdjustPointsModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMember?: {
    id: string;
    code: string;
    name: string;
    balance: number;
  };
}

export function AdjustPointsModal({
  onClose,
  onSuccess,
  initialMember,
}: AdjustPointsModalProps) {
  // Member Search State
  const [memberQuery, setMemberQuery] = useState(
    initialMember ? `${initialMember.code} - ${initialMember.name}` : ""
  );
  const [searchingMember, setSearchingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    code: string;
    name: string;
    phone: string;
    balance: number;
  } | null>(initialMember ? { ...initialMember, phone: "" } : null);

  // Adjustment Form State
  const [pointsType, setPointsType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [pointsInput, setPointsInput] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cari member
  async function handleSearchMember() {
    if (!memberQuery.trim()) {
      toast.error("Ketik kode member atau nomor HP terlebih dahulu");
      return;
    }
    setSearchingMember(true);
    try {
      const res = await findMemberForCashier(memberQuery.trim());
      if (res.success && res.member) {
        setSelectedMember({
          id: res.member.id,
          code: res.member.code,
          name: res.member.name,
          phone: res.member.phone,
          balance: res.member.balance,
        });
        toast.success(`Member ditemukan: ${res.member.name}`);
      } else {
        toast.error(res.error || "Member tidak ditemukan");
        setSelectedMember(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mencari member");
      setSelectedMember(null);
    } finally {
      setSearchingMember(false);
    }
  }

  const rawPoints = parseInt(pointsInput, 10) || 0;
  const deltaPoints = pointsType === "ADD" ? rawPoints : -rawPoints;
  const currentBalance = selectedMember?.balance ?? 0;
  const previewBalance = currentBalance + deltaPoints;
  const isNegativeBalance = previewBalance < 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMember) {
      toast.error("Pilih member terlebih dahulu");
      return;
    }

    if (rawPoints <= 0) {
      toast.error("Nilai poin harus lebih besar dari 0");
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Alasan koreksi wajib diisi (minimal 3 karakter)");
      return;
    }

    if (isNegativeBalance) {
      toast.error(
        `Pengurangan poin ditolak: Saldo tidak boleh negatif (estimasi saldo: ${previewBalance})`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await adjustMemberPoints({
        memberId: selectedMember.id,
        points: deltaPoints,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success(
          `Koreksi poin berhasil disimpan! Saldo baru ${selectedMember.name}: ${res.newBalance} poin.`
        );
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan koreksi poin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-kopi-dark-card w-full max-w-lg rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Koreksi Poin (ADJUST)
              </h2>
              <p className="text-xs text-gray-500">
                Penyesuaian saldo poin member oleh Admin dengan catatan audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. Pencarian Member */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Pilih Member
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-3 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchMember();
                    }
                  }}
                  placeholder="Ketik kode (mis. MBR-000001) atau nomor HP..."
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchMember}
                disabled={searchingMember}
                className="px-4 py-2.5 bg-kopi-green hover:bg-kopi-green/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
              >
                {searchingMember ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                Cari
              </button>
            </div>

            {/* Selected Member Card Preview */}
            {selectedMember && (
              <div className="mt-2 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {selectedMember.name}
                    </p>
                    <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      {selectedMember.code}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block">
                    Saldo Saat Ini
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                    {selectedMember.balance} pts
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Jenis Penyesuaian (+ / -) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Arah Penyesuaian
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPointsType("ADD")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  pointsType === "ADD"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                <span>➕ Tambah Poin</span>
              </button>
              <button
                type="button"
                onClick={() => setPointsType("SUBTRACT")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  pointsType === "SUBTRACT"
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`}
              >
                <span>➖ Kurangi Poin</span>
              </button>
            </div>
          </div>

          {/* 3. Jumlah Poin */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Jumlah Poin
            </label>
            <div className="relative">
              <Coins
                className="absolute left-3.5 top-3 text-gray-400"
                size={16}
              />
              <input
                type="number"
                min="1"
                step="1"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder="Contoh: 50"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* 4. Alasan Koreksi (Wajib) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Alasan Koreksi <span className="text-kopi-coral">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan koreksi (mis. Kompensasi pesanan lambat, pembatalan transaksi #TRX-..., dsb)"
              rows={3}
              required
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          {/* 5. Ringkasan Preview Estimasi Saldo */}
          {selectedMember && rawPoints > 0 && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isNegativeBalance
                  ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              <div className="flex justify-between font-medium">
                <span>Saldo Awal:</span>
                <span className="font-mono">{currentBalance} pts</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Penyesuaian ({pointsType === "ADD" ? "+ Poin" : "- Poin"}):</span>
                <span
                  className={`font-mono font-bold ${
                    pointsType === "ADD" ? "text-emerald-600" : "text-kopi-coral"
                  }`}
                >
                  {deltaPoints > 0 ? `+${deltaPoints}` : deltaPoints} pts
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between font-bold text-sm text-gray-900 dark:text-gray-100">
                <span>Estimasi Saldo Akhir:</span>
                <span
                  className={`font-mono ${
                    isNegativeBalance ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {previewBalance} pts
                </span>
              </div>
              {isNegativeBalance && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 pt-1">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Koreksi ditolak karena saldo akan menjadi negatif!</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !selectedMember ||
                rawPoints <= 0 ||
                !reason.trim() ||
                isNegativeBalance
              }
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Simpan Koreksi Poin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

