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
      width: 100,
      margin: 1,
    }).then(setDataUrl);
  }, [code]);

  if (!dataUrl)
    return (
      <div className="w-20 h-20 bg-[var(--in)] rounded-[12px] animate-pulse border border-[var(--line)]" />
    );
  return (
    <div className="p-1.5 bg-white rounded-[12px] border border-[var(--line)] shadow-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt={code} className="w-18 h-18 object-contain" />
    </div>
  );
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
      <div
        className="flex flex-col min-h-screen"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 1rem))",
        }}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md z-20 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <h1 className="text-[18px] font-extrabold text-[var(--ink)] tracking-tight">
            Voucher Saya
          </h1>
          <div className="flex gap-2 mt-2.5">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--brand)] text-white shadow-xs"
                      : "bg-[var(--card)] text-[var(--mut)] border border-[var(--line)] hover:text-[var(--ink)]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--brand)]" />
            <span className="text-[12.5px] text-[var(--mut)]">Memuat voucher...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--in)] flex items-center justify-center mb-3 text-[var(--mut)]">
              <Ticket className="w-7 h-7" />
            </div>
            <p className="text-[14px] font-bold text-[var(--ink)]">
              {filter === "ACTIVE"
                ? "Tidak ada voucher aktif"
                : filter === "USED"
                ? "Belum ada voucher yang dipakai"
                : "Belum ada voucher"}
            </p>
            <p className="text-[12px] text-[var(--mut)] mt-1 max-w-xs">
              Tukarkan saldo poin Anda di kasir untuk mendapatkan voucher reward.
            </p>
          </div>
        ) : (
          <div className="px-4 pt-3.5 space-y-3">
            {filtered.map((voucher) => (
              <div
                key={voucher.id}
                className={`bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4 shadow-xs flex items-center gap-4 ${
                  voucher.usedAt ? "opacity-60" : ""
                }`}
              >
                {/* QR Box */}
                <div className="flex-shrink-0">
                  <VoucherQR code={voucher.voucherCode} />
                </div>

                {/* Info Voucher */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-[13.5px] font-bold text-[var(--ink)] leading-snug truncate">
                      {voucher.reward.name}
                    </h3>
                  </div>

                  <p className="font-mono text-[12px] font-bold text-[var(--mut)] tracking-wider">
                    {voucher.voucherCode}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--line)]">
                    <span className="text-[11px] text-[var(--mut)]">
                      {formatDate(voucher.createdAt)}
                    </span>
                    {voucher.usedAt ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--mut)] bg-[var(--in)] px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Terpakai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--brand)] bg-[var(--mint)] px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        Siap Pakai
                      </span>
                    )}
                  </div>
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
