"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Printer, QrCode } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { generateMemberQrDataUrl } from "@/app/actions/member";
import { MemberLevel } from "@/lib/points";

interface MemberCardModalProps {
  member: {
    id: string;
    code: string;
    name: string;
    phone: string;
    level: MemberLevel;
    balance: number;
    createdAt: Date | string;
  } | null;
  onClose: () => void;
}

export function MemberCardModal({ member, onClose }: MemberCardModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState<boolean>(true);

  useEffect(() => {
    if (!member) return;
    let isMounted = true;
    generateMemberQrDataUrl(member.code)
      .then((url) => {
        if (isMounted) {
          setQrUrl(url);
          setLoadingQr(false);
        }
      })
      .catch((err) => {
        console.error("Gagal generate QR", err);
        if (isMounted) setLoadingQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [member]);

  if (!member) return null;

  function handlePrint() {
    window.print();
  }

  const levelStyles: Record<MemberLevel, { badge: string; border: string; bg: string }> = {
    Silver: {
      badge: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
      border: "border-slate-300 dark:border-slate-600",
      bg: "from-slate-800 to-slate-900",
    },
    Gold: {
      badge: "bg-amber-100 text-amber-900 font-bold border border-amber-300",
      border: "border-amber-400",
      bg: "from-amber-900 via-stone-900 to-amber-950",
    },
    Platinum: {
      badge: "bg-emerald-100 text-emerald-950 font-bold border border-emerald-300",
      border: "border-emerald-500",
      bg: "from-[#1F5C2E] via-stone-900 to-emerald-950",
    },
  };

  const style = levelStyles[member.level] || levelStyles.Silver;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 print:shadow-none print:border-none print:p-0">
        {/* Header Modal - Hidden when print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="text-kopi-green dark:text-kopi-olive" size={20} />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Kartu Member Digital
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Area Kartu Yang Dicetak */}
        <div className="p-6 flex flex-col items-center print:p-0">
          <div
            id="printable-loyalty-card"
            className={`w-full max-w-[400px] rounded-2xl bg-gradient-to-br ${style.bg} text-white p-6 shadow-xl relative overflow-hidden border ${style.border} print:w-[85.6mm] print:h-[53.98mm] print:rounded-lg print:shadow-none print:m-0`}
          >
            {/* Dekorasi Aksen Lingkaran Brand */}
            <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-kopi-olive/10 rounded-full blur-xl pointer-events-none" />

            {/* Header Kartu */}
            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-lg">
                  <Image
                    src="/logo.png"
                    alt="Kopi Nuri"
                    width={38}
                    height={38}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-bold tracking-wide text-sm leading-tight text-white">
                    KOPI NURI
                  </h3>
                  <p className="text-[10px] text-gray-300 tracking-wider">
                    COFFEE &amp; SPACE
                  </p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full tracking-wide uppercase font-semibold ${style.badge}`}
              >
                {member.level}
              </span>
            </div>

            {/* QR Code Utama - Bersih, Latar Putih Polos, Min 180px */}
            <div className="flex flex-col items-center justify-center my-3 relative z-10">
              <div className="bg-white p-3 rounded-xl shadow-md flex items-center justify-center">
                {loadingQr ? (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400 text-xs">
                    Memuat QR...
                  </div>
                ) : (
                  <Image
                    src={qrUrl}
                    alt={`QR Code ${member.code}`}
                    width={180}
                    height={180}
                    unoptimized
                    className="w-[180px] h-[180px] block"
                  />
                )}
              </div>
              <p className="font-mono text-sm tracking-widest font-bold mt-2 text-white">
                {member.code}
              </p>
            </div>

            {/* Informasi Member */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-end relative z-10">
              <div>
                <p className="font-semibold text-sm text-white truncate max-w-[200px]">
                  {member.name}
                </p>
                <p className="text-[11px] text-gray-300">
                  {formatPhoneDisplay(member.phone)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Saldo Poin</p>
                <p className="font-bold text-sm text-kopi-olive-light">
                  {member.balance.toLocaleString("id-ID")} pts
                </p>
              </div>
            </div>

            <div className="mt-2 text-[9px] text-gray-400 text-center relative z-10">
              Member sejak {formatTanggal(member.createdAt)}
            </div>
          </div>
        </div>

        {/* Footer Modal dengan Tombol Cetak - Hidden saat print */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center print:hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            QR siap dipindai scanner 2D atau kamera kasir.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-kopi-green hover:bg-kopi-green/90 text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
            >
              <Printer size={16} />
              Cetak Kartu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
