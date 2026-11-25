"use client";

import { useState, useEffect } from "react";
import { getMemberVouchers } from "@/app/actions/member-portal";
import { BottomNav } from "@/components/member/bottom-nav";
import { Loader2, Ticket, CheckCircle2, Clock } from "lucide-react";
import QRCode from "qrcode";

interface Voucher {
  id: string;
  voucherCode: string;
  usedAt: string | Date | null;
  createdAt: string | Date;
  reward: { name: string; pointCost: number };
}

function VoucherQR({ code }: { code: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(code, {
      errorCorrectionLevel: "M",
      width: 80,
      margin: 2,
    }).then(setDataUrl);
  }, [code]);

  if (!dataUrl) return <div className="w-20 h-20 bg-stone-100 rounded animate-pulse" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={code} className="w-20 h-20 rounded" />;
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const FILTERS = [
  { label: "Semua", value: "ALL" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Sudah Dipakai", value: "USED" },
];

export default function VoucherPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    getMemberVouchers().then((result) => {
      if (result.success && result.data) {
        setVouchers(result.data as Voucher[]);
      }
      setLoading(false);
    });
  }, []);

  const filtered = vouchers.filter((v) => {
    if (filter === "ACTIVE") return !v.usedAt;
    if (filter === "USED") return !!v.usedAt;
    return true;
  });

  return (
    <>
      <div className="flex flex-col min-h-screen pb-20">
        {/* Header */}
        <div className="px-4 pt-6 pb-3 border-b border-stone-100">
          <h1 className="text-lg font-bold text-stone-800">Voucher Saya</h1>
          {/* Filter */}
          <div className="flex gap-2 mt-3">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-[#1F5C2E] text-white"
                    : "bg-white text-stone-600 border border-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1F5C2E]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
            <Ticket className="w-12 h-12 text-stone-200" />
            <p className="text-stone-400 text-sm">
              {filter === "ACTIVE"
                ? "Tidak ada voucher aktif"
                : filter === "USED"
                ? "Belum ada voucher yang dipakai"
                : "Belum ada voucher"}
            </p>
            <p className="text-xs text-stone-400">
              Tukarkan poin di kasir untuk mendapatkan voucher
            </p>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {filtered.map((voucher) => (
              <div
                key={voucher.id}
                className={`bg-white rounded-2xl p-4 shadow-sm flex gap-4 ${
                  voucher.usedAt ? "opacity-60" : ""
                }`}
              >
                {/* QR kecil */}
                <div className="flex-shrink-0">
                  <VoucherQR code={voucher.voucherCode} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-800 leading-tight">
                      {voucher.reward.name}
                    </p>
                    {voucher.usedAt ? (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400 bg-stone-100 rounded-full px-2 py-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Terpakai
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 rounded-full px-2 py-0.5 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        Aktif
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-400 mt-1">
                    {voucher.reward.pointCost.toLocaleString("id-ID")} poin
                  </p>

                  <p className="font-mono text-xs font-bold text-stone-700 mt-2 tracking-widest">
                    {voucher.voucherCode}
                  </p>

                  <p className="text-[10px] text-stone-400 mt-1">
                    Ditukar: {formatDate(voucher.createdAt)}
                    {voucher.usedAt && (
                      <> · Dipakai: {formatDate(voucher.usedAt)}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </>
  );
}

