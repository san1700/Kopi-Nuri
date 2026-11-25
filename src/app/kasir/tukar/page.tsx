"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Gift,
  Search,
  Camera,
  Coins,
  Package,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { findMemberForCashier, CashierMemberProfile } from "@/app/actions/transaction";
import { getRewardsList } from "@/app/actions/reward";
import { redeemReward } from "@/app/actions/redemption";
import { CameraScannerModal } from "@/components/camera-scanner-modal";
import { VoucherCardModal } from "@/components/voucher-card-modal";
import { toast } from "sonner";

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  stock: number | null;
  isActive: boolean;
  redemptionCount: number;
}

interface IssuedVoucher {
  voucherCode: string;
  rewardName: string;
  pointsSpent: number;
  memberName: string;
  memberCode: string;
  createdAt: Date | string;
  qrDataUrl: string;
}

export default function KasirTukarRewardPage() {
  // Member Search State
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<CashierMemberProfile | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Rewards State
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [redeemMinPoints, setRedeemMinPoints] = useState(100);

  // Redeem Action State
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<RewardItem | null>(null);
  const [issuedVoucher, setIssuedVoucher] = useState<IssuedVoucher | null>(null);

  // Auto focus input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Load Active Rewards
  const loadRewards = useCallback(() => {
    let isMounted = true;
    getRewardsList(true)
      .then((data) => {
        if (isMounted) {
          setRewards(data as RewardItem[]);
          setLoadingRewards(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          toast.error("Gagal memuat katalog reward");
          setLoadingRewards(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return loadRewards();
  }, [loadRewards]);

  // Handle Search Member
  async function handleSearch(codeToSearch?: string) {
    const query = (codeToSearch ?? searchInput).trim();
    if (!query) {
      toast.error("Ketik kode member atau scan QR terlebih dahulu");
      searchInputRef.current?.focus();
      return;
    }

    setSearching(true);
    try {
      const res = await findMemberForCashier(query);
      if (res.success && res.member) {
        setMember(res.member);
        toast.success(`Member ditemukan: ${res.member.name}`);
        setSearchInput("");
      } else {
        toast.error(res.error || "Member tidak ditemukan");
        setMember(null);
        searchInputRef.current?.focus();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan pencarian");
      setMember(null);
    } finally {
      setSearching(false);
    }
  }

  // Handle Scan dari Kamera
  function handleCameraScanSuccess(decodedText: string) {
    setCameraModalOpen(false);
    setSearchInput(decodedText);
    handleSearch(decodedText);
  }

  // Handle Konfirmasi & Tukar
  async function handleRedeem(reward: RewardItem) {
    if (!member) {
      toast.error("Scan QR member terlebih dahulu sebelum menukar reward");
      searchInputRef.current?.focus();
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await redeemReward({
        memberId: member.id,
        rewardId: reward.id,
      });

      if (res.success) {
        toast.success(`Voucher "${res.voucherCode}" berhasil diterbitkan!`);
        // Update saldo member lokal
        setMember((prev) => (prev ? { ...prev, balance: res.newBalance } : null));

        // Update stok reward lokal jika ada stok
        setRewards((prev) =>
          prev.map((r) =>
            r.id === reward.id && r.stock !== null
              ? { ...r, stock: Math.max(0, r.stock - 1) }
              : r
          )
        );

        // Tampilkan Voucher Modal
        setIssuedVoucher({
          voucherCode: res.voucherCode,
          rewardName: res.rewardName,
          pointsSpent: res.pointsSpent,
          memberName: member.name,
          memberCode: member.code,
          createdAt: res.createdAt,
          qrDataUrl: res.qrDataUrl,
        });

        setConfirmReward(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menukar reward");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Gift className="text-kopi-green dark:text-kopi-olive" />
            Tukar Reward Member
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Penukaran poin loyalty member dengan voucher produk kopi dan makanan
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
          <ShieldAlert size={15} className="shrink-0 text-amber-600" />
          <span>Syarat Penukaran: Minimal Saldo {redeemMinPoints} Poin</span>
        </div>
      </div>

      {/* Bagian Scanner & Profil Member */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-3.5 text-gray-400"
              size={18}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Scan QR Member atau ketik kode (MBR-000001) / HP..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors uppercase placeholder:normal-case"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={searching}
              className="px-5 py-3 bg-kopi-green hover:bg-kopi-green/90 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Cari Member
            </button>

            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
              title="Scan QR menggunakan Kamera"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">Kamera</span>
            </button>
          </div>
        </div>

        {/* Member Profile Banner jika Member sudah teridentifikasi */}
        {member && (
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                <UserCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                    {member.name}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                      member.levelInfo.level === "Platinum"
                        ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                        : member.levelInfo.level === "Gold"
                        ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {member.levelInfo.level}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-mono font-semibold text-kopi-green dark:text-kopi-olive">
                    {member.code}
                  </span>
                  <span>•</span>
                  <span>{member.phone}</span>
                </div>
              </div>
            </div>

            {/* Saldo Member */}
            <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-emerald-200/60 dark:border-emerald-800/60">
              <div className="text-left md:text-right">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider block font-semibold">
                  Saldo Poin Tersedia
                </span>
                <span className="text-2xl font-black text-kopi-green dark:text-kopi-olive-light font-mono">
                  {member.balance}{" "}
                  <span className="text-xs font-semibold text-gray-400">pts</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMember(null);
                  searchInputRef.current?.focus();
                }}
                className="text-xs text-gray-500 hover:text-kopi-coral hover:underline py-1"
              >
                Ganti Member
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Katalog Reward */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>Pilihan Reward</span>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {rewards.length} Produk
            </span>
          </h2>

          <button
            onClick={() => loadRewards()}
            disabled={loadingRewards}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw size={12} className={loadingRewards ? "animate-spin" : ""} />
            Segarkan
          </button>
        </div>

        {loadingRewards ? (
          <div className="p-16 text-center text-gray-500 bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-kopi-green" />
            Memuat katalog reward...
          </div>
        ) : rewards.length === 0 ? (
          <div className="p-16 text-center text-gray-500 bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800">
            <Gift size={40} className="mx-auto mb-2 text-gray-400" />
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              Belum Ada Reward Aktif
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((reward) => {
              // Cek kondisi kelayakan penukaran
              const isStockOut = reward.stock !== null && reward.stock <= 0;
              const hasMember = !!member;
              const hasMinBalance = member ? member.balance >= redeemMinPoints : false;
              const hasEnoughPoints = member ? member.balance >= reward.pointsCost : false;
              const canRedeem = hasMember && hasMinBalance && hasEnoughPoints && !isStockOut;

              let buttonLabel = "Tukar Reward";
              let buttonDisabledReason = "";

              if (!hasMember) {
                buttonLabel = "Scan Member Dahulu";
                buttonDisabledReason = "Scan QR member terlebih dahulu";
              } else if (isStockOut) {
                buttonLabel = "Stok Habis";
                buttonDisabledReason = "Stok reward telah habis";
              } else if (!hasMinBalance) {
                const shortage = redeemMinPoints - member.balance;
                buttonLabel = `Minimal Saldo ${redeemMinPoints} Poin`;
                buttonDisabledReason = `Kurang ${shortage} poin untuk syarat minimal penukaran`;
              } else if (!hasEnoughPoints) {
                const shortage = reward.pointsCost - member.balance;
                buttonLabel = `Kurang ${shortage} Poin`;
                buttonDisabledReason = `Saldo member kurang ${shortage} poin`;
              }

              return (
                <div
                  key={reward.id}
                  className={`bg-white dark:bg-kopi-dark-card rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
                    canRedeem
                      ? "border-emerald-300/80 dark:border-emerald-800/80 hover:shadow-md"
                      : "border-gray-200 dark:border-gray-800 opacity-80"
                  }`}
                >
                  <div>
                    {/* Header Item */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-kopi-green/10 text-kopi-green dark:text-kopi-olive flex items-center justify-center shrink-0">
                        <Gift size={20} />
                      </div>
                      <div className="flex items-center gap-1.5 text-kopi-green dark:text-kopi-olive-light font-black text-lg">
                        <Coins size={18} />
                        <span>{reward.pointsCost}</span>
                        <span className="text-xs font-semibold text-gray-400">pts</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                      {reward.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
                      {reward.description || "Reward spesial Kopi Nuri"}
                    </p>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package size={13} />
                        {reward.stock !== null ? (
                          reward.stock > 0 ? (
                            <span>Stok: <strong>{reward.stock}</strong></span>
                          ) : (
                            <span className="text-kopi-coral font-bold">Stok Habis</span>
                          )
                        ) : (
                          <span>Stok Tersedia</span>
                        )}
                      </span>
                      <span>Ditukar: {reward.redemptionCount}x</span>
                    </div>
                  </div>

                  {/* Tombol Aksi Penukaran */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmReward(reward)}
                      disabled={!canRedeem || redeemingId === reward.id}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        canRedeem
                          ? "bg-kopi-green hover:bg-kopi-green/90 text-white shadow-xs cursor-pointer active:scale-98"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {redeemingId === reward.id ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <span>{buttonLabel}</span>
                          {canRedeem && <ArrowRight size={14} />}
                        </>
                      )}
                    </button>

                    {buttonDisabledReason && (
                      <p className="text-[11px] text-center text-gray-400 dark:text-gray-500">
                        {buttonDisabledReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Penukaran */}
      {confirmReward && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-kopi-dark-card w-full max-w-sm rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <Gift size={24} />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Konfirmasi Penukaran
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Pastikan data penukaran voucher sudah sesuai
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 text-xs space-y-2 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Member:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {member.name} ({member.code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reward:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {confirmReward.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Biaya Poin:</span>
                <span className="font-extrabold text-kopi-coral">
                  -{confirmReward.pointsCost} Poin
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-gray-100">
                <span>Sisa Saldo:</span>
                <span className="font-mono text-emerald-600">
                  {member.balance - confirmReward.pointsCost} Poin
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmReward(null)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleRedeem(confirmReward)}
                disabled={redeemingId === confirmReward.id}
                className="flex-1 py-2.5 bg-kopi-green hover:bg-kopi-green/90 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {redeemingId === confirmReward.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Ya, Tukar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner Kamera */}
      {cameraModalOpen && (
        <CameraScannerModal
          onScan={handleCameraScanSuccess}
          onClose={() => setCameraModalOpen(false)}
        />
      )}

      {/* Modal Voucher Card Setelah Sukses Ditukar */}
      {issuedVoucher && (
        <VoucherCardModal
          voucher={{
            ...issuedVoucher,
            status: "UNUSED",
          }}
          onClose={() => setIssuedVoucher(null)}
        />
      )}
    </div>
  );
}

