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
      <div className="flex flex-col min-h-screen pb-20">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 border-b border-stone-100">
          <h1 className="text-lg font-bold text-stone-800">Katalog Reward</h1>
          {data && (
            <p className="text-sm text-stone-500 mt-1">
              Saldo kamu:{" "}
              <span className="font-bold text-[#1F5C2E]">
                {data.balance.toLocaleString("id-ID")} poin
              </span>
            </p>
          )}
        </div>

        {/* Info tukar di kasir */}
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Penukaran reward dilakukan di <strong>kasir Kopi Nuri</strong>. Tunjukkan kartu QR kamu kepada kasir.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1F5C2E]" />
          </div>
        ) : !data || data.rewards.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <Gift className="w-12 h-12 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Belum ada reward tersedia</p>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 grid grid-cols-2 gap-3">
            {data.rewards.map((reward) => {
              const canRedeem = data.balance >= reward.pointCost && data.balance >= data.redeemMinPoints;
              const deficit = reward.pointCost - data.balance;

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1F5C2E]/10 flex items-center justify-center mb-1">
                    <Gift className="w-5 h-5 text-[#1F5C2E]" />
                  </div>

                  <p className="text-sm font-semibold text-stone-800 leading-tight">
                    {reward.name}
                  </p>

                  {reward.description && (
                    <p className="text-xs text-stone-400 leading-snug line-clamp-2">
                      {reward.description}
                    </p>
                  )}

                  <div className="mt-auto pt-2 border-t border-stone-100">
                    <p className="text-sm font-bold text-[#1F5C2E]">
                      {reward.pointCost.toLocaleString("id-ID")} poin
                    </p>
                    {reward.stock !== null && (
                      <p className="text-xs text-stone-400">Stok: {reward.stock}</p>
                    )}
                  </div>

                  {canRedeem ? (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 rounded-lg px-2 py-1 text-center">
                      ✓ Cukup poin
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-stone-400 bg-stone-100 rounded-lg px-2 py-1 text-center">
                      Kurang {Math.max(deficit, 0).toLocaleString("id-ID")} poin
                    </span>
                  )}
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

