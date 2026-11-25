"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { getMemberHome, pollMemberBalance } from "@/app/actions/member-portal";
import { toast } from "sonner";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, X, ZoomIn } from "lucide-react";

type LedgerType = "EARN" | "BONUS" | "REDEEM" | "ADJUST";

interface ActivityItem {
  id: string;
  type: LedgerType;
  points: number;
  note: string | null;
  createdAt: string | Date;
}

interface HomeData {
  member: {
    id: string;
    memberCode: string;
    name: string;
  };
  balance: number;
  levelInfo: {
    level: string;
    nextLevel: string | null;
    pointsToNextLevel: number;
    progressPercent: number;
    totalEarned: number;
  };
  qrDataUrl: string;
  recentLedger: ActivityItem[];
}

function useCountUp(target: number, duration = 1000) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);
  const currentRef = useRef(0);

  useEffect(() => {
    const start = Date.now();
    const startVal = currentRef.current;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startVal + eased * (target - startVal));
      currentRef.current = next;
      setCurrent(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

function LEVEL_BADGE({ level }: { level: string }) {
  const styles: Record<string, string> = {
    Silver: "bg-stone-200 text-stone-700",
    Gold: "bg-yellow-100 text-yellow-700",
    Platinum: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[level] ?? "bg-stone-200 text-stone-700"}`}>
      {level}
    </span>
  );
}

function ActivityIcon({ type }: { type: LedgerType }) {
  if (type === "EARN") return <span className="text-green-500 font-bold">▲</span>;
  if (type === "REDEEM") return <span className="text-red-500 font-bold">▼</span>;
  if (type === "BONUS") return <span className="text-blue-500 font-bold">★</span>;
  return <span className="text-yellow-500 font-bold">⚡</span>;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function BerandaPage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const prevBalance = useRef<number | null>(null);
  const animatedBalance = useCountUp(data?.balance ?? 0);

  const loadHome = useCallback(async () => {
    const result = await getMemberHome();
    if (result.success && result.data) {
      setData(result.data as HomeData);
      prevBalance.current = result.data.balance;
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    getMemberHome().then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setData(result.data as HomeData);
        prevBalance.current = result.data.balance;
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Polling tiap 12 detik saat tab aktif
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      interval = setInterval(async () => {
        if (document.visibilityState !== "visible") return;
        const result = await pollMemberBalance();
        if (result.success && typeof result.balance === "number") {
          const prev = prevBalance.current ?? 0;
          const delta = result.balance - prev;
          if (delta > 0) {
            toast.success(`🎉 Kamu dapat +${delta} poin!`);
          }
          if (delta !== 0) {
            await loadHome();
          }
        }
      }, 12000);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadHome]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#1F5C2E]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 text-center">
        <div>
          <p className="text-stone-600 mb-4">Sesi berakhir. Silakan login kembali.</p>
          <a href="/member/login" className="text-[#1F5C2E] font-semibold">
            Login →
          </a>
        </div>
      </div>
    );
  }

  const { member, balance, levelInfo, qrDataUrl, recentLedger } = data;
  const nextLevelLabel = levelInfo.nextLevel
    ? `${levelInfo.level} → ${levelInfo.nextLevel}`
    : "Level Tertinggi";

  return (
    <>
      {/* QR Fullscreen Modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"
          onClick={() => setQrOpen(false)}
        >
          <button
            onClick={() => setQrOpen(false)}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
          >
            <X className="w-7 h-7" />
          </button>
          <p className="text-sm text-stone-500 mb-4">{member.memberCode}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Member" className="w-72 h-72" />
          <p className="text-xs text-stone-400 mt-6">Ketuk untuk menutup</p>
        </div>
      )}

      <div className="flex flex-col pb-20 min-h-screen">
        {/* Header */}
        <div className="px-4 pt-6 pb-2 flex items-center gap-3">
          <Image src="/logo.png" alt="Kopi Nuri" width={80} height={32} className="object-contain" />
          <span className="text-sm text-stone-500 ml-auto">Halo, {member.name.split(" ")[0]} 👋</span>
        </div>

        {/* Kartu Digital */}
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1F5C2E] to-stone-900 text-white p-5 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-green-200 font-medium uppercase tracking-wider">Kopi Nuri Loyalty</p>
              <p className="text-lg font-bold mt-0.5">{member.name}</p>
            </div>
            <LEVEL_BADGE level={levelInfo.level} />
          </div>

          <div className="flex items-center gap-5">
            {/* QR */}
            <button
              onClick={() => setQrOpen(true)}
              className="bg-white rounded-xl p-2 flex-shrink-0 group"
              title="Perbesar QR"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR" className="w-28 h-28" />
              <div className="flex items-center justify-center gap-1 mt-1">
                <ZoomIn className="w-3 h-3 text-stone-400" />
                <span className="text-[9px] text-stone-400">Perbesar</span>
              </div>
            </button>

            {/* Info */}
            <div className="flex-1">
              <p className="text-xs text-green-300 mb-0.5">Kode Member</p>
              <p className="font-mono text-base font-bold">{member.memberCode}</p>

              <div className="mt-3">
                <p className="text-xs text-green-300 mb-0.5">Saldo Poin</p>
                <p className="text-3xl font-bold">{animatedBalance.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Level */}
        <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-stone-700">{nextLevelLabel}</p>
            <span className="text-xs text-stone-400">{levelInfo.progressPercent}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5 mb-2">
            <div
              className="bg-gradient-to-r from-[#1F5C2E] to-[#9AA52A] h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          {levelInfo.nextLevel ? (
            <p className="text-xs text-stone-500">
              Butuh <span className="font-semibold text-[#1F5C2E]">{levelInfo.pointsToNextLevel} poin</span> lagi menuju {levelInfo.nextLevel}
            </p>
          ) : (
            <p className="text-xs text-[#9AA52A] font-semibold">✓ Kamu sudah di level tertinggi!</p>
          )}
        </div>

        {/* 3 Aktivitas Terakhir */}
        {recentLedger.length > 0 && (
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-stone-700">Aktivitas Terakhir</p>
              <a href="/member/riwayat" className="text-xs text-[#1F5C2E] font-medium">
                Lihat semua →
              </a>
            </div>
            <div className="space-y-3">
              {recentLedger.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-600 truncate">{item.note ?? item.type}</p>
                    <p className="text-[10px] text-stone-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ${item.points >= 0 ? "text-green-600" : "text-red-500"}`}
                  >
                    {item.points >= 0 ? "+" : ""}{item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </>
  );
}

