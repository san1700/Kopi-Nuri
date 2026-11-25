"use client";

import { useState, useRef, useEffect } from "react";
import {
  ScanLine,
  Camera,
  Search,
  UserCheck,
  Coins,
  ArrowRight,
  RotateCcw,
  Clock,
  Sparkles,
  AlertTriangle,
  Loader2,
  CheckCircle2,
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

  // State member terpilih
  const [member, setMember] = useState<CashierMemberProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // State transaksi
  const [amountStr, setAmountStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{
    memberName: string;
    memberCode: string;
    amount: number;
    pointsEarned: number;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // Selalu fokuskan ke input scan saat pertama buka atau saat form di-reset
  useEffect(() => {
    if (!member && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [member]);

  // Kalkulasi poin perolehan real-time (Rp 10.000 = 5 poin, kelipatan penuh)
  const amountNum = parseInt(amountStr.replace(/\D/g, ""), 10) || 0;
  const estimatedPoints = Math.floor(amountNum / 10000) * 5;

  // Handle pencarian member (dari input scan atau kamera)
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
        // Refocus ke input scan
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
    // Buat client-side idempotency key unik
    const idempotencyKey = `tx-${member.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await submitCashierTransaction({
        memberId: member.id,
        amount,
        shift,
        idempotencyKey,
      });

      const successData = {
        memberName: member.name,
        memberCode: member.code,
        amount,
        pointsEarned: res.pointsEarned,
      };

      setLastSuccess(successData);
      toast.success(
        `Transaksi Rp ${amount.toLocaleString("id-ID")} berhasil! +${res.pointsEarned} poin untuk ${member.name}`
      );

      // Reset form dan fokus kembali ke input scan
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const shiftLabels: Record<Shift, { label: string; time: string; badge: string }> = {
    PAGI: {
      label: "Shift Pagi",
      time: "06:00 - 14:00",
      badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
    },
    SIANG: {
      label: "Shift Siang",
      time: "14:00 - 22:00",
      badge: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200",
    },
    MALAM: {
      label: "Shift Malam",
      time: "22:00 - 06:00",
      badge: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200",
    },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Kasir dengan Shift Switcher */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="text-kopi-green dark:text-kopi-olive" size={24} />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Terminal Kasir
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Scan QR Code member untuk catat transaksi &amp; tambah poin
          </p>
        </div>

        {/* Shift Control */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start bg-gray-50 dark:bg-gray-800/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <Clock size={15} />
            <span>Shift:</span>
          </div>
          <div className="flex gap-1">
            {(["PAGI", "SIANG", "MALAM"] as Shift[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  shift === s
                    ? "bg-kopi-green text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner Transaksi Sukses Terakhir */}
      {lastSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Transaksi Sukses: {formatRupiah(lastSuccess.amount)}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Member {lastSuccess.memberName} ({lastSuccess.memberCode}) berhasil mendapatkan{" "}
                <span className="font-bold underline">+{lastSuccess.pointsEarned} poin</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastSuccess(null)}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Input Scan vs Profil Member */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Input Scan QR & Nominal Belanja (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card Scan QR Member */}
          <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scan-input"
                className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
              >
                <ScanLine size={18} className="text-kopi-green" />
                Scan QR Code Member
              </label>
              <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                Scanner 2D Ready
              </span>
            </div>

            {/* Input Barcode Scanner */}
            <div className="relative">
              <input
                id="scan-input"
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                placeholder="Arahkan scanner 2D atau ketik MBR-000001 / No. HP..."
                disabled={scanning}
                className="w-full px-4 py-3.5 pl-11 rounded-xl border-2 border-kopi-green/40 dark:border-kopi-green/30 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 text-base font-mono focus:border-kopi-green focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-kopi-green/10 transition-all outline-hidden"
                autoComplete="off"
              />
              <ScanLine
                className="absolute left-3.5 top-4 text-kopi-green dark:text-kopi-olive"
                size={20}
              />
              {scanning && (
                <div className="absolute right-3.5 top-3.5">
                  <Loader2 size={20} className="animate-spin text-kopi-green" />
                </div>
              )}
            </div>

            {/* Tombol Aksi Scan Tambahan */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSearchMember(scanInput)}
                disabled={scanning || !scanInput.trim()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Search size={15} />
                Cari Manual
              </button>

              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-kopi-green/10 hover:bg-kopi-green/20 text-kopi-green dark:text-kopi-olive-light rounded-xl text-xs font-semibold transition-colors"
              >
                <Camera size={15} />
                Scan dengan Kamera
              </button>

              {member && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-kopi-coral hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors ml-auto"
                >
                  <RotateCcw size={14} />
                  Ganti Member
                </button>
              )}
            </div>

            {/* Pesan Error Scan */}
            {searchError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-kopi-coral">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Form Input Nominal Belanja (Muncul saat member sudah di-scan) */}
          {member && (
            <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-6 border-2 border-kopi-green/30 dark:border-kopi-green/20 shadow-md space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Coins className="text-kopi-olive" size={20} />
                  Input Transaksi Belanja
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {shiftLabels[shift].label}
                </span>
              </div>

              <form onSubmit={handleTransactionSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="amount-input"
                    className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2"
                  >
                    Total Belanja (Rupiah)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-base font-bold text-gray-400">
                      Rp
                    </span>
                    <input
                      id="amount-input"
                      type="text"
                      inputMode="numeric"
                      value={amountStr}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const num = parseInt(raw, 10);
                        setAmountStr(num ? num.toLocaleString("id-ID") : "");
                      }}
                      placeholder="0"
                      required
                      autoFocus
                      className="w-full pl-12 pr-4 py-3 text-2xl font-bold font-mono rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-all outline-hidden"
                    />
                  </div>
                </div>

                {/* Tombol Shortcut Preset Nominal */}
                <div className="flex flex-wrap gap-2">
                  {[25000, 50000, 85000, 100000, 150000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountStr(preset.toLocaleString("id-ID"))}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>

                {/* Box Estimasi Poin Real-time */}
                <div className="p-4 rounded-xl bg-kopi-cream dark:bg-kopi-dark-bg border border-kopi-olive/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-kopi-olive/20 text-kopi-olive flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Estimasi Poin Diperoleh:
                      </p>
                      <p className="text-xs text-gray-500">
                        Aturan: Rp 10.000 = 5 Poin (kelipatan penuh)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-kopi-green dark:text-kopi-olive-light">
                      +{estimatedPoints}
                    </span>
                    <span className="text-xs text-gray-500 ml-1 font-semibold">poin</span>
                  </div>
                </div>

                {/* Tombol Simpan Transaksi */}
                <button
                  type="submit"
                  disabled={submitting || !amountStr}
                  className="w-full py-4 bg-kopi-green hover:bg-kopi-green/90 text-white font-bold rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Memproses Transaksi...
                    </>
                  ) : (
                    <>
                      Simpan Transaksi ({amountStr ? `Rp ${amountStr}` : "Rp 0"})
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Kartu Profil Member Terpilih (5 Cols) */}
        <div className="lg:col-span-5">
          {member ? (
            <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-xs space-y-6 sticky top-20 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2 text-kopi-green dark:text-kopi-olive">
                  <UserCheck size={20} />
                  <span className="font-bold text-sm">Profil Member Terverifikasi</span>
                </div>
                <span className="text-xs font-mono font-bold bg-kopi-green/10 text-kopi-green px-2.5 py-1 rounded-md">
                  {member.code}
                </span>
              </div>

              {/* Nama & Kontak */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {member.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {formatPhoneDisplay(member.phone)}
                </p>
              </div>

              {/* Saldo Poin Display */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                  Saldo Poin Saat Ini
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                    {member.balance.toLocaleString("id-ID")}
                  </span>
                  <span className="text-sm font-semibold text-gray-500">poin</span>
                </div>
              </div>

              {/* Info Level & Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-500">Tier Member:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 uppercase font-bold text-[11px]">
                    {member.levelInfo.level}
                  </span>
                </div>

                {member.levelInfo.nextLevel ? (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-kopi-green dark:bg-kopi-olive h-full transition-all duration-500"
                        style={{ width: `${member.levelInfo.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 text-right">
                      Butuh <strong>{member.levelInfo.pointsToNextLevel} poin</strong> lagi untuk naik ke{" "}
                      <strong>{member.levelInfo.nextLevel}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-right">
                    ⭐ Telah mencapai level tertinggi (Platinum)
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Placeholder belum ada member di-scan */
            <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-8 border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400">
                <ScanLine size={32} />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                Belum Ada Member Terpilih
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                Scan QR Code pada kartu digital member menggunakan scanner barcode USB atau kamera perangkat untuk memulai transaksi.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Kamera */}
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
