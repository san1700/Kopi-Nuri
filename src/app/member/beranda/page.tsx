"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { getMemberHome, pollMemberBalance } from "@/app/actions/member-portal";
import { toast } from "sonner";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, X, ZoomIn, ArrowUpRight, ArrowDownLeft, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

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

function useCountUp(target: number, duration = 800) {
  const [current, setCurrent] = useState(target);
  const rafRef = useRef<number | null>(null);
  const currentRef = useRef(target);

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

function LevelBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    Silver: "bg-white/20 text-white border-white/30",
    Gold: "bg-[#D9DA73]/25 text-[#FFF59D] border-[#D9DA73]/40",
    Platinum: "bg-[#DDF3E4]/25 text-[#9EE5B5] border-[#DDF3E4]/40",
  };
  return (
    <span
      className={`text-[11px] font-bold px-3 py-0.5 rounded-full border backdrop-blur-md shadow-xs ${
        colors[level] ?? colors.Silver
      }`}
    >
      {level}
    </span>
  );
}

function ActivityIcon({ type }: { type: LedgerType }) {
  if (type === "EARN")
    return (
      <div className="w-8 h-8 rounded-[10px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center flex-shrink-0">
        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  if (type === "REDEEM")
    return (
      <div className="w-8 h-8 rounded-[10px] bg-[var(--badbg)] text-[var(--bad)] flex items-center justify-center flex-shrink-0">
        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  if (type === "BONUS")
    return (
      <div className="w-8 h-8 rounded-[10px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 stroke-[2.5]" />
      </div>
    );
  return (
    <div className="w-8 h-8 rounded-[10px] bg-[var(--warnbg)] text-[var(--warn)] flex items-center justify-center flex-shrink-0">
      <AlertCircle className="w-4 h-4 stroke-[2.5]" />
    </div>
  );
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
        <span className="text-[13px] text-[var(--mut)] font-medium">Memuat kartu member...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-6 max-w-xs shadow-md">
          <p className="text-[var(--mut)] text-[14px] mb-4">Sesi login telah berakhir.</p>
          <Link
            href="/member/login"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-[var(--btn)] text-white text-[13px] font-bold rounded-[12px] shadow-sm hover:opacity-90 transition-opacity"
          >
            Masuk Kembali
          </Link>
        </div>
      </div>
    );
  }

  const { member, levelInfo, qrDataUrl, recentLedger } = data;
  const nextLevelLabel = levelInfo.nextLevel
    ? `${levelInfo.level} → ${levelInfo.nextLevel}`
    : "Level Tertinggi";

  // Nama panggilan tanpa karakter underscore berlebih
  const cleanedName = member.name.replace(/_/g, " ").trim();
  const firstName = cleanedName.split(" ")[0] || member.name;

  return (
    <>
      {/* Modal QR Code Fullscreen */}
      {qrOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setQrOpen(false)}
        >
          <button
            onClick={() => setQrOpen(false)}
            aria-label="Tutup QR"
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="bg-white rounded-[24px] p-6 flex flex-col items-center shadow-2xl max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[12px] font-bold text-stone-400 tracking-wider uppercase mb-1">
              Kode Member
            </span>
            <p className="font-mono text-[20px] font-extrabold text-stone-900 tracking-wider mb-4">
              {member.memberCode}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="QR Member Kopi Nuri"
              className="w-64 h-64 rounded-xl border border-stone-200 p-2"
            />
            <p className="text-[12px] text-stone-500 mt-4 font-medium">
              Tunjukkan ke kasir untuk perolehan & penukaran poin
            </p>
          </div>
        </div>
      )}

      {/* Kontainer Utama Presisi Mobile */}
      <div
        className="flex flex-col flex-1"
        style={{
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 1rem))",
        }}
      >
        {/* Top Header Mobile */}
        <header className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[12px] bg-white p-1 border border-[var(--line)] shadow-xs flex items-center justify-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Logo Kopi Nuri"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <b className="text-[15px] font-extrabold text-[var(--ink)] block tracking-tight">
                Kopi Nuri
              </b>
              <span className="text-[11px] text-[var(--mut)]">
                Sistem Poin Member
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[var(--mut)] block">Selamat datang</span>
            <span className="text-[13px] font-extrabold text-[var(--ink)]">
              Halo, {firstName} 👋
            </span>
          </div>
        </header>

        {/* Digital Loyalty Card */}
        <section
          aria-label="Kartu Member Digital"
          className="mx-4 mt-2.5 rounded-[22px] overflow-hidden bg-gradient-to-br from-[#10331F] via-[#143B25] to-[#1E6B35] text-white p-5 shadow-[0_12px_28px_-6px_rgba(16,51,31,0.32)] border border-white/15 relative"
        >
          {/* Subtle Background Ornament */}
          <div
            className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none blur-xl"
            aria-hidden="true"
          />

          {/* Baris Atas Kartu */}
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] text-[#A3D9B4] font-extrabold uppercase tracking-widest">
                Kopi Nuri Loyalty
              </p>
              <h2 className="text-[18px] sm:text-[20px] font-black text-white tracking-tight truncate mt-0.5">
                {member.name}
              </h2>
            </div>
            <LevelBadge level={levelInfo.level} />
          </div>

          {/* Baris Bawah: QR Code & Info Saldo */}
          <div className="flex items-center gap-4 sm:gap-5 relative z-10 pt-1">
            {/* Box QR Code */}
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="bg-white rounded-[16px] p-2 flex flex-col items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-transform group cursor-pointer"
              title="Ketuk untuk perbesar QR"
              aria-label="Perbesar QR Code"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Member"
                className="w-24 h-24 sm:w-26 sm:h-26 object-contain"
              />
              <div className="flex items-center justify-center gap-1 mt-1 text-[10px] font-bold text-stone-500 group-hover:text-stone-800">
                <ZoomIn className="w-3 h-3 text-stone-400" />
                <span>Perbesar</span>
              </div>
            </button>

            {/* Info Kode & Saldo Poin */}
            <div className="flex-1 min-w-0">
              <div>
                <p className="text-[11px] text-[#A3D9B4] font-semibold mb-0.5">
                  Kode Member
                </p>
                <p className="font-mono text-[14px] sm:text-[15px] font-extrabold tracking-wider text-white select-all">
                  {member.memberCode}
                </p>
              </div>

              <div className="mt-3.5">
                <p className="text-[11px] text-[#A3D9B4] font-semibold mb-0.5">
                  Saldo Poin
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[32px] sm:text-[36px] font-black text-white leading-none tracking-tight">
                    {animatedBalance.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[12px] font-bold text-white/80">poin</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Kartu Progress Level */}
        <section
          aria-label="Progres Level"
          className="mx-4 mt-3.5 bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4.5 shadow-[var(--sh)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold text-[var(--ink)]">
              {nextLevelLabel}
            </span>
            <span className="text-[12px] font-extrabold text-[var(--brand)]">
              {levelInfo.progressPercent}%
            </span>
          </div>
          <div className="w-full bg-[var(--in)] rounded-full h-2.5 mb-2 overflow-hidden border border-[var(--line)]/50">
            <div
              className="bg-gradient-to-r from-[var(--brand)] to-[var(--olive)] h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(levelInfo.progressPercent, 100)}%` }}
            />
          </div>
          {levelInfo.nextLevel ? (
            <p className="text-[12px] text-[var(--mut)] font-medium">
              Butuh{" "}
              <b className="text-[var(--brand)] font-bold">
                {levelInfo.pointsToNextLevel.toLocaleString("id-ID")} poin
              </b>{" "}
              lagi menuju {levelInfo.nextLevel}
            </p>
          ) : (
            <p className="text-[12px] text-[var(--brand)] font-bold">
              ✓ Anda telah mencapai level tertinggi!
            </p>
          )}
        </section>

        {/* Kartu Aktivitas Terakhir */}
        <section
          aria-label="Aktivitas Terakhir"
          className="mx-4 mt-3.5 bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4.5 shadow-[var(--sh)]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[var(--ink)]">
              Aktivitas Terakhir
            </h3>
            <Link
              href="/member/riwayat"
              className="text-[12px] font-bold text-[var(--brand)] hover:underline flex items-center gap-0.5"
            >
              Lihat semua →
            </Link>
          </div>

          {recentLedger.length === 0 ? (
            <div className="py-6 text-center text-[var(--mut)] text-[12.5px]">
              Belum ada riwayat transaksi poin
            </div>
          ) : (
            <div className="space-y-3">
              {recentLedger.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[var(--ink)] truncate">
                      {item.note || item.type}
                    </p>
                    <p className="text-[11px] text-[var(--mut)]">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-[13px] font-extrabold flex-shrink-0 ${
                      item.points >= 0
                        ? "text-[var(--brand)]"
                        : "text-[var(--bad)]"
                    }`}
                  >
                    {item.points >= 0 ? "+" : ""}
                    {item.points} poin
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </>
  );
}
