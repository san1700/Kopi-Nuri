"use client";

import Image from "next/image";
import { X, Printer, Copy, Check, Ticket, QrCode } from "lucide-react";
import { formatTanggalWaktu } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

interface VoucherCardModalProps {
  voucher: {
    voucherCode: string;
    rewardName: string;
    pointsSpent: number;
    memberName?: string;
    memberCode?: string;
    status?: "UNUSED" | "USED";
    createdAt: Date | string;
    qrDataUrl?: string;
    usedAt?: Date | string | null;
  } | null;
  onClose: () => void;
}

export function VoucherCardModal({ voucher, onClose }: VoucherCardModalProps) {
  const [copied, setCopied] = useState(false);

  if (!voucher) return null;

  function handleCopy() {
    if (!voucher) return;
    navigator.clipboard.writeText(voucher.voucherCode);
    setCopied(true);
    toast.success(`Kode voucher ${voucher.voucherCode} disalin`);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 print:shadow-none print:border-none print:p-0">
        {/* Header Modal - Hidden when print */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 print:hidden">
          <div className="flex items-center gap-2">
            <Ticket className="text-kopi-green dark:text-kopi-olive" size={20} />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Voucher Penukaran Reward
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Voucher Ticket Body */}
        <div className="p-6 flex flex-col items-center text-center print:p-0">
          <div
            id="printable-loyalty-card"
            className="w-full rounded-2xl bg-gradient-to-br from-[#1F5C2E] to-stone-900 text-white p-6 shadow-xl relative overflow-hidden border border-emerald-500/40 print:w-[80mm] print:rounded-none print:border print:border-black print:text-black print:bg-white"
          >
            {/* Header Voucher */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-white p-1 rounded-md">
                <Image
                  src="/logo.png"
                  alt="Kopi Nuri"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-xs tracking-wider uppercase text-white print:text-black">
                  KOPI NURI
                </h3>
                <p className="text-[9px] text-gray-300 print:text-gray-600">
                  COFFEE &amp; SPACE
                </p>
              </div>
            </div>

            {/* Nama Reward */}
            <div className="py-2 border-y border-white/15 print:border-black/20 my-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-300 print:text-gray-600">
                Reward Ditukar
              </p>
              <h4 className="text-lg font-extrabold text-white print:text-black mt-0.5">
                {voucher.rewardName}
              </h4>
              <p className="text-xs font-semibold text-kopi-olive-light print:text-black mt-0.5">
                -{voucher.pointsSpent} Poin
              </p>
            </div>

            {/* QR Code Kecil Berisi Kode Voucher */}
            <div className="my-3 flex flex-col items-center">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                {voucher.qrDataUrl ? (
                  <Image
                    src={voucher.qrDataUrl}
                    alt={`QR Voucher ${voucher.voucherCode}`}
                    width={130}
                    height={130}
                    unoptimized
                    className="w-[130px] h-[130px] block"
                  />
                ) : (
                  <div className="w-[130px] h-[130px] flex items-center justify-center bg-gray-100 text-gray-400">
                    <QrCode size={40} />
                  </div>
                )}
              </div>
            </div>

            {/* Kode Voucher Unik */}
            <div className="bg-black/30 print:bg-gray-100 rounded-lg p-2.5 my-2">
              <p className="text-[9px] uppercase tracking-wider text-gray-300 print:text-gray-600">
                Kode Voucher
              </p>
              <p className="font-mono text-xl font-black tracking-widest text-amber-300 print:text-black mt-0.5">
                {voucher.voucherCode}
              </p>
            </div>

            {/* Member Info */}
            {voucher.memberName && (
              <p className="text-xs text-gray-200 print:text-gray-700 mt-2">
                Member: <strong>{voucher.memberName}</strong> ({voucher.memberCode})
              </p>
            )}

            <p className="text-[10px] text-gray-400 print:text-gray-500 mt-1">
              Diterbitkan: {formatTanggalWaktu(voucher.createdAt)}
            </p>

            {voucher.status === "USED" && (
              <div className="mt-2 py-1 px-3 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider">
                Voucher Sudah Digunakan
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Hidden when print */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Tersalin" : "Salin Kode"}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold rounded-lg transition-colors"
            >
              <Printer size={14} />
              Cetak
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-kopi-green hover:bg-kopi-green/90 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

