"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Gift,
  Search,
  Camera,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { findMemberForCashier, CashierMemberProfile } from "@/app/actions/transaction";
import { getRewardsList } from "@/app/actions/reward";
import { redeemReward } from "@/app/actions/redemption";
import { CameraScannerModal } from "@/components/camera-scanner-modal";
import { VoucherCardModal } from "@/components/voucher-card-modal";
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
  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<CashierMemberProfile | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const redeemMinPoints = 100;

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<RewardItem | null>(null);
  const [issuedVoucher, setIssuedVoucher] = useState<IssuedVoucher | null>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const loadRewards = useCallback(() => {
    let isMounted = true;
    getRewardsList(true)
      .then((data) => {
        if (isMounted) {
          setRewards(data as RewardItem[]);
          setLoadingRewards(false);
        }
      })
      .catch(() => {
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

  function handleCameraScanSuccess(decodedText: string) {
    setCameraModalOpen(false);
    setSearchInput(decodedText);
    handleSearch(decodedText);
  }

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
        setMember((prev) => (prev ? { ...prev, balance: res.newBalance } : null));
        setRewards((prev) =>
          prev.map((r) =>
            r.id === reward.id && r.stock !== null
              ? { ...r, stock: Math.max(0, r.stock - 1) }
              : r
          )
        );
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
    <div>
      <PageHeader
        title="Tukar reward member"
        subtitle="Tukarkan poin loyalty dengan voucher kopi dan makanan."
        actions={
          <span className="inline-flex items-center gap-2 font-semibold text-[13px] px-3.5 py-2 rounded-[12px] bg-[var(--warnbg)] text-[var(--warn)]">
            <AlertTriangle size={16} />
            Minimal saldo {redeemMinPoints} poin
          </span>
        }
      />

      {/* Pencarian Member */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
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
            placeholder="Scan QR member atau ketik kode (MBR-000001) / no. HP"
            className="flex-1 min-w-[220px] border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
          />
          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={searching}
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Cari member
          </button>
          <button
            type="button"
            onClick={() => setCameraModalOpen(true)}
            className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] font-semibold cursor-pointer"
            style={{ boxShadow: "var(--sh)" }}
          >
            <Camera size={16} />
            Kamera
          </button>
        </div>

        {/* Profil Member Terpilih */}
        {member && (
          <div className="mt-4 pt-4 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--olive)] text-[#10331F] grid place-items-center font-extrabold">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <b className="text-[var(--ink)]">{member.name}</b>
                <div className="text-[12.5px] text-[var(--mut)] font-mono">
                  {member.code} · {member.levelInfo.level}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[12px] text-[var(--mut)] block">Saldo tersedia</span>
              <span className="text-[24px] font-extrabold text-[var(--brand)]">
                {member.balance.toLocaleString("id-ID")} poin
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Header Pilihan Reward */}
      <div className="flex items-center justify-between gap-2 mt-5 mb-3.5">
        <h2 className="text-[16px] font-bold text-[var(--ink)] flex items-center gap-2">
          Pilihan reward
          <StatusPill variant="success">{rewards.length} produk</StatusPill>
        </h2>
        <button
          type="button"
          onClick={() => loadRewards()}
          className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer"
          style={{ boxShadow: "var(--sh)" }}
        >
          <RefreshCw size={15} />
          Segarkan
        </button>
      </div>

      {/* Grid Reward */}
      {loadingRewards ? (
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-12 text-center text-[var(--mut)]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[var(--brand)]" />
          Memuat katalog reward...
        </div>
      ) : rewards.length === 0 ? (
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-5"
          style={{ boxShadow: "var(--sh)" }}
        >
          <EmptyState
            icon={<Gift size={24} />}
            title="Belum ada reward aktif"
            description={
              <>
                Tambahkan reward di menu{" "}
                <Link href="/admin/reward" className="text-[var(--brand)] font-semibold hover:underline">
                  Katalog reward
                </Link>
                .
              </>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rewards.map((reward) => {
            const outOfStock = reward.stock !== null && reward.stock <= 0;
            const insufficientMin = member ? member.balance < redeemMinPoints : false;
            const insufficientCost = member ? member.balance < reward.pointsCost : false;
            const shortage = member ? Math.max(reward.pointsCost - member.balance, 0) : 0;
            const canRedeem = Boolean(member && !outOfStock && !insufficientMin && !insufficientCost);

            return (
              <div
                key={reward.id}
                className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] flex flex-col justify-between gap-3"
                style={{ boxShadow: "var(--sh)" }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-9 h-9 rounded-[11px] bg-[var(--mint)] text-[var(--brand)] grid place-items-center">
                      <Gift size={18} />
                    </span>
                    {reward.stock !== null && (
                      <StatusPill variant={outOfStock ? "danger" : "neutral"}>
                        {outOfStock ? "Habis" : `Stok ${reward.stock}`}
                      </StatusPill>
                    )}
                  </div>
                  <h3 className="font-bold text-[var(--ink)] mt-3">{reward.name}</h3>
                  {reward.description && (
                    <p className="text-[12.5px] text-[var(--mut)] mt-1 line-clamp-2">
                      {reward.description}
                    </p>
                  )}
                  <b className="block text-[20px] font-extrabold text-[var(--brand)] mt-2">
                    {reward.pointsCost.toLocaleString("id-ID")} poin
                  </b>
                </div>

                {!member ? (
                  <span className="text-[12px] text-[var(--mut)]">
                    Pilih member untuk menukar
                  </span>
                ) : outOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-[12px] bg-[var(--bg)] text-[var(--mut)] text-[13px] font-semibold opacity-60"
                  >
                    Stok habis
                  </button>
                ) : insufficientMin ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-[12px] bg-[var(--warnbg)] text-[var(--warn)] text-[13px] font-semibold"
                  >
                    Saldo di bawah minimal ({redeemMinPoints})
                  </button>
                ) : insufficientCost ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-[12px] bg-[var(--bg)] text-[var(--mut)] text-[13px] font-semibold"
                  >
                    Kurang {shortage.toLocaleString("id-ID")} poin
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReward(reward)}
                    disabled={!canRedeem || redeemingId === reward.id}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--btn)] text-white text-[13.5px] font-semibold cursor-pointer hover:opacity-95"
                  >
                    Tukar reward <ArrowRight size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Konfirmasi Tukar */}
      {confirmReward && member && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] max-w-md w-full p-6 space-y-4"
            style={{ boxShadow: "var(--sh)" }}
          >
            <h3 className="text-[18px] font-bold text-[var(--ink)]">Konfirmasi penukaran</h3>
            <p className="text-[14px] text-[var(--mut)]">
              Tukarkan <b className="text-[var(--ink)]">{confirmReward.pointsCost} poin</b> milik{" "}
              <b className="text-[var(--ink)]">{member.name}</b> untuk{" "}
              <b className="text-[var(--ink)]">{confirmReward.name}</b>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmReward(null)}
                className="border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-4 py-2 text-[14px] font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={redeemingId === confirmReward.id}
                onClick={() => handleRedeem(confirmReward)}
                className="bg-[var(--btn)] text-white rounded-[12px] px-4 py-2 text-[14px] font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {redeemingId === confirmReward.id && <Loader2 size={16} className="animate-spin" />}
                Ya, tukarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraModalOpen && (
        <CameraScannerModal
          onScan={handleCameraScanSuccess}
          onClose={() => setCameraModalOpen(false)}
        />
      )}

      {issuedVoucher && (
        <VoucherCardModal
          voucher={issuedVoucher}
          onClose={() => setIssuedVoucher(null)}
        />
      )}
    </div>
  );
}
