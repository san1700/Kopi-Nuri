"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  TicketCheck,
  Search,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  Gift,
  RefreshCw,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { getVoucherDetail, validateAndUseVoucher } from "@/app/actions/redemption";
import { CameraScannerModal } from "@/components/camera-scanner-modal";
import { formatTanggalWaktu } from "@/lib/format";
import { toast } from "sonner";

interface VoucherDetailData {
  id: string;
  voucherCode: string;
  pointsSpent: number;
  status: "UNUSED" | "USED";
  createdAt: Date | string;
  usedAt: Date | string | null;
  qrDataUrl: string;
  member: {
    id: string;
    code: string;
    name: string;
    phone: string;
  };
  reward: {
    id: string;
    name: string;
    description: string | null;
    pointsCost: number;
  };
  usedBy: {
    id: string;
    name: string;
  } | null;
}

export default function KasirValidasiVoucherPage() {
  const [codeInput, setCodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [voucher, setVoucher] = useState<VoucherDetailData | null>(null);
  const [validating, setValidating] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleCheckVoucher(codeToCheck?: string) {
    const raw = (codeToCheck ?? codeInput).trim();
    if (!raw) {
      toast.error("Masukkan kode voucher atau scan QR voucher");
      inputRef.current?.focus();
      return;
    }

    setSearching(true);
    try {
      const res = await getVoucherDetail(raw);
      if (res.success && res.voucher) {
        setVoucher(res.voucher as VoucherDetailData);
        toast.success(`Voucher "${res.voucher.voucherCode}" ditemukan`);
        setCodeInput("");
      } else {
        toast.error(res.error || "Voucher tidak ditemukan");
        setVoucher(null);
        inputRef.current?.focus();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
      setVoucher(null);
    } finally {
      setSearching(false);
    }
  }

  function handleCameraScanSuccess(decodedText: string) {
    setCameraModalOpen(false);
    setCodeInput(decodedText);
    handleCheckVoucher(decodedText);
  }

  async function handleMarkAsUsed() {
    if (!voucher) return;
    if (voucher.status === "USED") {
      toast.error("Voucher ini sudah dipakai sebelumnya dan tidak dapat dipakai lagi!");
      return;
    }

    setValidating(true);
    try {
      const res = await validateAndUseVoucher(voucher.voucherCode);
      if (res.success) {
        toast.success(
          `Voucher "${voucher.voucherCode}" (${voucher.reward.name}) berhasil divalidasi dan ditandai sudah dipakai!`
        );
        // Perbarui status voucher di tampilan
        setVoucher((prev) =>
          prev
            ? {
                ...prev,
                status: "USED",
                usedAt: new Date(),
              }
            : null
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memvalidasi voucher");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <TicketCheck className="text-kopi-green dark:text-kopi-olive" />
          Validasi Voucher Member
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scan QR voucher atau masukkan kode unik untuk memverifikasi dan menandai voucher yang telah digunakan
        </p>
      </div>

      {/* Input / Scanner Section */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
            <input
              ref={inputRef}
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCheckVoucher();
                }
              }}
              placeholder="Masukkan kode voucher (mis. KN-8K92MB) atau scan..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold tracking-wider text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCheckVoucher()}
              disabled={searching}
              className="px-5 py-3 bg-kopi-green hover:bg-kopi-green/90 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
            >
              {searching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Cek Voucher
            </button>

            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
              title="Scan QR menggunakan Kamera"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">Scan Kamera</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kartu Detail Voucher */}
      {voucher && (
        <div className="bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Status Bar */}
          <div
            className={`px-6 py-4 flex items-center justify-between border-b ${
              voucher.status === "UNUSED"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {voucher.status === "UNUSED" ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span>VOUCHER AKTIF (BELUM DIGUNAKAN)</span>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-red-600 dark:text-red-400" />
                  <span>VOUCHER SUDAH DIGUNAKAN</span>
                </>
              )}
            </div>

            <span className="text-xs font-mono font-bold tracking-widest px-2.5 py-1 rounded-md bg-white/70 dark:bg-black/30 border">
              {voucher.voucherCode}
            </span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kolom Kiri: QR Code Kecil */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="bg-white p-2.5 rounded-lg shadow-xs border">
                {voucher.qrDataUrl ? (
                  <Image
                    src={voucher.qrDataUrl}
                    alt={voucher.voucherCode}
                    width={140}
                    height={140}
                    unoptimized
                    className="w-[140px] h-[140px] block"
                  />
                ) : (
                  <div className="w-[140px] h-[140px] flex items-center justify-center bg-gray-100 text-gray-400">
                    <QrCode size={48} />
                  </div>
                )}
              </div>
              <p className="font-mono text-base font-extrabold tracking-widest text-gray-900 dark:text-gray-100 mt-3">
                {voucher.voucherCode}
              </p>
              <p className="text-[11px] text-gray-400">Kode Unik Voucher</p>
            </div>

            {/* Kolom Tengah & Kanan: Detail Reward & Member */}
            <div className="md:col-span-2 space-y-4">
              {/* Box Info Reward */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  <Gift size={14} className="text-kopi-green" />
                  <span>Reward Produk</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {voucher.reward.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {voucher.reward.description || "Reward loyalty Kopi Nuri"}
                </p>
                <div className="mt-2 text-xs font-semibold text-kopi-green dark:text-kopi-olive">
                  Poin Ditukar: {voucher.pointsSpent} pts
                </div>
              </div>

              {/* Box Info Member & Tanggal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 flex items-center gap-1.5 mb-1">
                    <User size={13} />
                    <span>Member Pemilik</span>
                  </span>
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {voucher.member.name}
                  </p>
                  <p className="font-mono text-[11px] text-kopi-green font-semibold">
                    {voucher.member.code} • {voucher.member.phone}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-400 flex items-center gap-1.5 mb-1">
                    <Calendar size={13} />
                    <span>Waktu Penukaran</span>
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatTanggalWaktu(voucher.createdAt)}
                  </p>
                </div>
              </div>

              {/* Riwayat Penggunaan Jika Sudah USED */}
              {voucher.status === "USED" && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 dark:text-red-300">
                    <AlertCircle size={15} />
                    <span>Informasi Validasi Penggunaan:</span>
                  </div>
                  <p className="text-red-600 dark:text-red-300">
                    Digunakan pada:{" "}
                    <strong>{voucher.usedAt ? formatTanggalWaktu(voucher.usedAt) : "—"}</strong>
                  </p>
                  <p className="text-red-600 dark:text-red-300">
                    Divalidasi oleh:{" "}
                    <strong>{voucher.usedBy?.name || "Kasir"}</strong>
                  </p>
                </div>
              )}

              {/* Action Button: Tandai Sudah Dipakai */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {voucher.status === "UNUSED" ? (
                  <button
                    type="button"
                    onClick={handleMarkAsUsed}
                    disabled={validating}
                    className="flex-1 py-3 px-5 bg-kopi-green hover:bg-kopi-green/90 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                  >
                    {validating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Memvalidasi...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Tandai Sudah Dipakai (Validasi)
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-xl text-xs font-semibold text-center border border-gray-200 dark:border-gray-700">
                    ⛔ Voucher sudah tidak berlaku lagi karena telah digunakan
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setVoucher(null);
                    setCodeInput("");
                    inputRef.current?.focus();
                  }}
                  className="py-3 px-4 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cek Voucher Lain
                </button>
              </div>
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
    </div>
  );
}

