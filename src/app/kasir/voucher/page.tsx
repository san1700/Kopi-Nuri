"use client";

import { useState, useEffect, useRef } from "react";
import {
  TicketCheck,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getVoucherDetail, validateAndUseVoucher } from "@/app/actions/redemption";
import { CameraScannerModal } from "@/components/camera-scanner-modal";
import { formatTanggalWaktu } from "@/lib/format";
import { toast } from "sonner";
import { PageHeader, StatusPill } from "@/components/ui/kopi-ui";

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
    <div>
      <PageHeader
        title="Validasi voucher"
        subtitle="Scan QR voucher atau masukkan kode unik untuk memverifikasi dan menandai voucher yang sudah dipakai."
      />

      {/* Satu kartu utama */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-5 max-w-[860px]"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
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
            placeholder="Masukkan kode voucher (mis. KN-8K92MB) atau scan"
            className="flex-1 min-w-[240px] text-[17px] px-[18px] py-4 border-2 border-[var(--brand)] bg-[var(--in)] text-[var(--ink)] rounded-[16px] uppercase placeholder:normal-case focus:outline-none focus:ring-3 focus:ring-[var(--mint)]"
          />
          <button
            type="button"
            onClick={() => handleCheckVoucher()}
            disabled={searching}
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-3.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
          >
            {searching ? <Loader2 size={17} className="animate-spin" /> : <TicketCheck size={17} />}
            Cek voucher
          </button>
          <button
            type="button"
            onClick={() => setCameraModalOpen(true)}
            className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-4 py-3.5 text-[14px] font-semibold cursor-pointer"
            style={{ boxShadow: "var(--sh)" }}
          >
            <Camera size={17} />
            Scan kamera
          </button>
        </div>

        {/* Detail Voucher */}
        {voucher && (
          <div className="mt-6 pt-5 border-t border-[var(--line)] flex flex-col sm:flex-row gap-5 items-start">
            <div className="bg-white p-2 rounded-[14px] border border-[var(--line)] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={voucher.qrDataUrl} alt={voucher.voucherCode} className="w-28 h-28" />
            </div>

            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[18px] font-extrabold text-[var(--ink)]">
                  {voucher.voucherCode}
                </span>
                {voucher.status === "UNUSED" ? (
                  <StatusPill variant="success">
                    <CheckCircle2 size={13} /> Belum dipakai
                  </StatusPill>
                ) : (
                  <StatusPill variant="danger">
                    <XCircle size={13} /> Sudah dipakai
                  </StatusPill>
                )}
              </div>

              <div className="text-[16px] font-bold text-[var(--brand)]">
                {voucher.reward.name} ({voucher.pointsSpent} poin)
              </div>

              <div className="text-[13px] text-[var(--mut)] space-y-0.5">
                <p>
                  Member: <b className="text-[var(--ink)]">{voucher.member.name}</b> ({voucher.member.code})
                </p>
                <p>Diterbitkan: {formatTanggalWaktu(voucher.createdAt)}</p>
                {voucher.usedAt && <p>Dipakai pada: {formatTanggalWaktu(voucher.usedAt)}</p>}
              </div>

              {voucher.status === "UNUSED" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleMarkAsUsed}
                    disabled={validating}
                    className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-5 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {validating ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                    Tandai sudah dipakai
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {cameraModalOpen && (
        <CameraScannerModal
          onScan={handleCameraScanSuccess}
          onClose={() => setCameraModalOpen(false)}
        />
      )}
    </div>
  );
}
