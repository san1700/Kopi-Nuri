"use client";

import { useState, useRef, useEffect } from "react";
import {
  ScanLine,
  Camera,
  Search,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Shift } from "@prisma/client";
import {
  findMemberForCashier,
  submitCashierTransaction,
  CashierMemberProfile,
} from "@/app/actions/transaction";
import { CameraScannerModal } from "@/components/camera-scanner-modal";
import { formatRupiah } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";
import {
  PageHeader,
  SegmentedControl,
  StatusPill,
  EmptyState,
  FormField,
} from "@/components/ui/kopi-ui";

function getInitialShift(): Shift {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "PAGI";
  if (hour >= 14 && hour < 22) return "SIANG";
  return "MALAM";
}

export default function KasirPage() {
  const [shift, setShift] = useState<Shift>(() => getInitialShift());
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const [member, setMember] = useState<CashierMemberProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [amountStr, setAmountStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{
    memberName: string;
    memberCode: string;
    amount: number;
    pointsEarned: number;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!member && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [member]);

  const amountNum = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const estimatedPoints = Math.floor(amountNum / 10000) * 5;

  async function handleSearchMember(query: string) {
    const target = query.trim();
    if (!target) return;

    setScanning(true);
    setSearchError(null);
    setLastSuccess(null);

    try {
      const res = await findMemberForCashier(target);
      if (res.success && res.member) {
        setMember(res.member);
        setScanInput("");
      } else {
        setSearchError(res.error || "Member tidak ditemukan");
        setMember(null);
        toast.error(res.error || "Member tidak ditemukan");
        setTimeout(() => scanInputRef.current?.focus(), 100);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mencari member";
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  }

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchMember(scanInput);
    }
  }

  function resetForm() {
    setMember(null);
    setAmountStr("");
    setSearchError(null);
    setScanInput("");
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }

  async function handleTransactionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    const amount = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
    if (amount <= 0) {
      toast.error("Masukkan total belanja lebih dari Rp 0");
      return;
    }

    setSubmitting(true);
    const idempotencyKey = `tx-${member.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await submitCashierTransaction({
        memberId: member.id,
        amount,
        shift,
        idempotencyKey,
      });

      setLastSuccess({
        memberName: member.name,
        memberCode: member.code,
        amount,
        pointsEarned: res.pointsEarned,
      });
      toast.success(
        `Transaksi Rp ${amount.toLocaleString("id-ID")} berhasil! +${res.pointsEarned} poin untuk ${member.name}`
      );
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function levelVariant(level: string) {
    if (level === "Platinum") return "success" as const;
    if (level === "Gold") return "warn" as const;
    return "neutral" as const;
  }

  return (
    <div>
      <PageHeader
        title="Terminal kasir"
        subtitle="Scan QR member untuk mencatat transaksi dan menambah poin."
        actions={
          <SegmentedControl
            value={shift}
            onChange={setShift}
            options={[
              { label: "Pagi", value: "PAGI" },
              { label: "Siang", value: "SIANG" },
              { label: "Malam", value: "MALAM" },
            ]}
          />
        }
      />

      {/* Banner transaksi sukses terakhir */}
      {lastSuccess && (
        <div className="mb-4 bg-[var(--mint)] border border-[var(--brand)]/30 text-[var(--brand)] rounded-[16px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[13.5px] font-semibold">
            <CheckCircle2 size={18} />
            <span>
              Transaksi {lastSuccess.memberName} ({lastSuccess.memberCode}) sebesar{" "}
              {formatRupiah(lastSuccess.amount)} tercatat: +{lastSuccess.pointsEarned} poin.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastSuccess(null)}
            className="text-[12px] font-bold underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Panel Kiri: Scan QR */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)]">
              Scan QR member
            </h2>
            <StatusPill variant="neutral">Scanner 2D siap</StatusPill>
          </div>

          <input
            ref={scanInputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            disabled={scanning}
            placeholder="Arahkan scanner atau ketik MBR-000001 / no. HP, lalu tekan Enter"
            className="w-full text-[17px] px-[18px] py-4 border-2 border-[var(--brand)] bg-[var(--in)] text-[var(--ink)] rounded-[16px] focus:outline-none focus:ring-3 focus:ring-[var(--mint)]"
          />

          {searchError && (
            <div className="mt-3 px-3.5 py-2.5 rounded-[12px] bg-[var(--badbg)] text-[var(--bad)] text-[13px] font-semibold flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{searchError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => handleSearchMember(scanInput)}
              disabled={scanning || !scanInput.trim()}
              className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
              style={{ boxShadow: "var(--sh)" }}
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Cari manual
            </button>
            <button
              type="button"
              onClick={() => setCameraModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-3.5 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95"
            >
              <Camera size={16} />
              Scan dengan kamera
            </button>
          </div>
        </div>

        {/* Panel Kanan: Member Terpilih + Input Nominal */}
        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          {!member ? (
            <EmptyState
              icon={<ScanLine size={24} />}
              title="Belum ada member terpilih"
              description="Scan QR pada kartu digital member untuk memulai transaksi."
            />
          ) : (
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              {/* Info Member */}
              <div className="flex items-center gap-3 pb-3 border-b border-[var(--line)]">
                <div className="w-10 h-10 rounded-full bg-[var(--olive)] text-[#10331F] grid place-items-center font-extrabold shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <b className="block text-[var(--ink)] truncate">{member.name}</b>
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--mut)] mt-0.5">
                    <span className="font-mono">{member.code}</span>
                    <span>·</span>
                    <span>{formatPhoneDisplay(member.phone)}</span>
                    <StatusPill variant={levelVariant(member.levelInfo.level)}>
                      {member.levelInfo.level}
                    </StatusPill>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[28px] font-extrabold text-[var(--brand)] leading-none">
                    {member.balance.toLocaleString("id-ID")}
                  </span>
                  <small className="block text-[12px] text-[var(--mut)]">poin</small>
                </div>
              </div>

              {/* Input Nominal */}
              <FormField
                label="Nominal belanja (Rp)"
                hint="Setiap Rp 10.000 mendapat 5 poin (pembulatan ke bawah)"
              >
                <input
                  type="number"
                  min={0}
                  step={500}
                  autoFocus
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="50000"
                  className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[16px] font-bold focus:outline-none focus:border-[var(--brand)]"
                />
              </FormField>

              {/* Pratinjau Poin */}
              <div>
                <p className="text-[12.5px] text-[var(--mut)]">Poin yang didapat</p>
                <div className="text-[28px] font-extrabold text-[var(--brand)] tracking-[-0.5px]">
                  +{estimatedPoints.toLocaleString("id-ID")} poin
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-3 text-[14px] font-semibold cursor-pointer"
                >
                  <RotateCcw size={16} />
                  Ganti
                </button>
                <button
                  type="submit"
                  disabled={submitting || amountNum <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-3 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  Catat transaksi
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {cameraModalOpen && (
        <CameraScannerModal
          onScan={(code) => {
            setCameraModalOpen(false);
            setScanInput(code);
            handleSearchMember(code);
          }}
          onClose={() => setCameraModalOpen(false)}
        />
      )}
    </div>
  );
}
