"use client";

import { useState, useEffect } from "react";
import { getMemberRewardCatalog } from "@/app/actions/member-portal";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, Gift, Info } from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointCost: number;
  stock: number | null;
}

interface CatalogData {
  rewards: Reward[];
  balance: number;
  redeemMinPoints: number;
}

export default function RewardPage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMemberRewardCatalog().then((result) => {
      if (result.success && result.data) {
        setData(result.data as CatalogData);
      }
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div
        className="flex flex-col min-h-screen"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 1rem))",
        }}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md z-20 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center justify-between">
            <h1 className="text-[18px] font-extrabold text-[var(--ink)] tracking-tight">
              Katalog Reward
            </h1>
            {data && (
              <span className="text-[12px] font-bold text-[var(--brand)] bg-[var(--mint)] px-2.5 py-1 rounded-full">
                Saldo: {data.balance.toLocaleString("id-ID")} poin
              </span>
            )}
          </div>
        </header>

        {/* Info Petunjuk Penukaran */}
        <div className="mx-4 mt-3.5 bg-[var(--warnbg)] border border-[var(--warn)]/20 rounded-[16px] p-3.5 flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-[var(--warn)] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--ink)] leading-relaxed">
            Penukaran reward dilakukan di <b>kasir Kopi Nuri</b>. Tunjukkan kartu QR member Anda saat memesan.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--brand)]" />
            <span className="text-[12.5px] text-[var(--mut)]">Memuat katalog reward...</span>
          </div>
        ) : !data || data.rewards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--in)] flex items-center justify-center mb-3 text-[var(--mut)]">
              <Gift className="w-7 h-7" />
            </div>
            <p className="text-[14px] font-bold text-[var(--ink)]">Belum ada reward</p>
            <p className="text-[12px] text-[var(--mut)] mt-1">
              Reward baru akan segera hadir di katalog ini.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-3.5 grid grid-cols-2 gap-3">
            {data.rewards.map((reward) => {
              const canRedeem =
                data.balance >= reward.pointCost &&
                data.balance >= data.redeemMinPoints;
              const deficit = reward.pointCost - data.balance;

              return (
                <div
                  key={reward.id}
                  className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-3.5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-[12px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center mb-2.5">
                      <Gift className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <h3 className="text-[13px] font-bold text-[var(--ink)] leading-snug line-clamp-2">
                      {reward.name}
                    </h3>

                    {reward.description && (
                      <p className="text-[11px] text-[var(--mut)] leading-normal line-clamp-2 mt-1">
                        {reward.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[var(--line)]">
                    <p className="text-[14px] font-black text-[var(--brand)]">
                      {reward.pointCost.toLocaleString("id-ID")}{" "}
                      <span className="text-[11px] font-semibold text-[var(--mut)]">
                        poin
                      </span>
                    </p>
                    {reward.stock !== null && (
                      <p className="text-[10.5px] text-[var(--mut)] mt-0.5">
                        Stok: {reward.stock}
                      </p>
                    )}

                    <div className="mt-2">
                      {canRedeem ? (
                        <span className="inline-block w-full text-[10.5px] font-extrabold text-[var(--brand)] bg-[var(--mint)] rounded-[8px] py-1 text-center">
                          ✓ Poin Cukup
                        </span>
                      ) : (
                        <span className="inline-block w-full text-[10.5px] font-semibold text-[var(--mut)] bg-[var(--in)] rounded-[8px] py-1 text-center truncate px-1">
                          Kurang {Math.max(deficit, 0).toLocaleString("id-ID")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </>
  );
}
