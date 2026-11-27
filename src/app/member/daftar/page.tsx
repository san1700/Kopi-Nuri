"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { requestMemberOtp, verifyOtpAndRegister } from "@/app/actions/member-portal";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, PartyPopper } from "lucide-react";

type Step = "form" | "otp" | "success";

interface FormValues {
  name: string;
  phone: string;
  email: string;
  pin: string;
  pinConfirm: string;
  waOptIn: boolean;
}

interface OtpState {
  phone: string;
  simulatedOtp?: string;
  formValues: FormValues;
}

export default function DaftarPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [isPending, startTransition] = useTransition();
  const [showPin, setShowPin] = useState(false);
  const [otpState, setOtpState] = useState<OtpState | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [bonusPoints, setBonusPoints] = useState(10);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState<FormValues>({
    name: "",
    phone: "",
    email: "",
    pin: "",
    pinConfirm: "",
    waOptIn: false,
  });
  const [errors, setErrors] = useState<Partial<FormValues & { general: string }>>({});

  function validate(): boolean {
    const e: Partial<FormValues & { general: string }> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = "Nama minimal 2 karakter";
    if (!form.phone.trim() || form.phone.trim().length < 8)
      e.phone = "Nomor HP minimal 8 digit";
    if (!/^\d{4,6}$/.test(form.pin))
      e.pin = "PIN harus 4-6 digit angka";
    if (form.pin !== form.pinConfirm)
      e.pinConfirm = "Konfirmasi PIN tidak cocok";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function startCooldown() {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleFormChange(field: keyof FormValues, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleRequestOtp() {
    if (!validate()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("phone", form.phone.trim());
      fd.set("email", form.email.trim());
      fd.set("pin", form.pin);
      fd.set("waOptIn", String(form.waOptIn));

      const result = await requestMemberOtp(fd);
      if (!result.success) {
        setErrors({ general: result.error });
        return;
      }

      setOtpState({
        phone: result.phone!,
        simulatedOtp: result.simulatedOtp,
        formValues: { ...form },
      });
      setOtpInput("");
      setStep("otp");
      startCooldown();
      toast.success(`OTP dikirim ke ${result.phone}`);
    });
  }

  async function handleVerifyAndRegister() {
    if (!otpState) return;
    if (otpInput.trim().length !== 6) {
      toast.error("Masukkan 6 digit kode OTP");
      return;
    }
    startTransition(async () => {
      const v = otpState.formValues;
      const fd = new FormData();
      fd.set("name", v.name.trim());
      fd.set("phone", otpState.phone);
      fd.set("email", v.email.trim());
      fd.set("pin", v.pin);
      fd.set("waOptIn", String(v.waOptIn));
      fd.set("otp", otpInput.trim());

      const result = await verifyOtpAndRegister(fd);
      if (!result.success) {
        toast.error(result.error || "Verifikasi gagal");
        return;
      }

      setBonusPoints(result.bonusPoints ?? 10);
      setStep("success");
    });
  }

  async function handleResend() {
    if (!otpState || resendCooldown > 0) return;
    startTransition(async () => {
      const v = otpState.formValues;
      const fd = new FormData();
      fd.set("name", v.name.trim());
      fd.set("phone", otpState.phone);
      fd.set("email", v.email.trim());
      fd.set("pin", v.pin);
      fd.set("waOptIn", String(v.waOptIn));
      const result = await requestMemberOtp(fd);
      if (result.success) {
        setOtpState((prev) =>
          prev ? { ...prev, simulatedOtp: result.simulatedOtp } : prev
        );
        startCooldown();
        toast.success("Kode OTP baru telah dikirim");
      } else {
        toast.error(result.error || "Gagal kirim ulang OTP");
      }
    });
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8 text-center">
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[24px] p-7 shadow-sm max-w-xs w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center mb-4">
            <PartyPopper className="w-8 h-8" />
          </div>
          <h1 className="text-[20px] font-extrabold text-[var(--ink)] mb-2">
            Selamat Bergabung!
          </h1>
          <p className="text-[13px] text-[var(--mut)] mb-4 leading-relaxed">
            Pendaftaran berhasil! Anda mendapatkan bonus sambutan:
          </p>
          <div className="bg-[var(--mint)] border border-[var(--brand)]/20 rounded-[14px] px-4 py-2.5 mb-6">
            <span className="text-[22px] font-black text-[var(--brand)]">
              +{bonusPoints} Poin
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/member/beranda")}
            className="w-full bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-bold shadow-xs hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
          >
            Buka Kartu Member →
          </button>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col min-h-screen px-5 py-8 justify-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-[14px] bg-white p-2 border border-[var(--line)] shadow-sm flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Kopi Nuri"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[22px] p-6 shadow-sm">
          <h2 className="text-[17px] font-extrabold text-[var(--ink)] mb-1">
            Verifikasi OTP
          </h2>
          <p className="text-[12.5px] text-[var(--mut)] mb-4">
            Masukkan kode yang dikirim ke <b>{otpState?.phone}</b>
          </p>

          {/* Banner Mode Simulasi */}
          {otpState?.simulatedOtp && (
            <div className="bg-[var(--warnbg)] border border-[var(--warn)]/30 rounded-[14px] p-3.5 mb-4">
              <p className="text-[11px] font-bold text-[var(--warn)] mb-0.5">
                🔧 Mode Uji (Simulasi OTP)
              </p>
              <p className="text-[13px] text-[var(--ink)]">
                Kode OTP Anda:{" "}
                <span className="font-mono font-black text-[16px] tracking-widest text-[var(--brand)]">
                  {otpState.simulatedOtp}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5 text-center">
                Kode OTP (6 Digit)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) =>
                  setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••••"
                className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[14px] px-4 py-3 text-center text-[22px] tracking-[0.4em] font-mono font-extrabold focus:outline-none focus:border-[var(--brand)]"
              />
            </div>

            <button
              type="button"
              onClick={handleVerifyAndRegister}
              disabled={isPending || otpInput.length !== 6}
              className="w-full bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-bold shadow-xs hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Verifikasi & Selesai
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isPending}
              className="w-full text-[var(--brand)] text-[12.5px] font-bold py-2 disabled:text-[var(--mut)] cursor-pointer"
            >
              {resendCooldown > 0
                ? `Kirim ulang dalam ${resendCooldown}s`
                : "Kirim ulang kode OTP"}
            </button>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-[var(--mut)] hover:text-[var(--ink)] text-[12.5px] font-medium py-1 cursor-pointer"
            >
              ← Ubah nomor atau data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step: form
  return (
    <div className="flex flex-col min-h-screen px-5 py-8 justify-center">
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-[14px] bg-white p-2 border border-[var(--line)] shadow-sm flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Kopi Nuri"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <h1 className="text-[19px] font-extrabold text-[var(--ink)] mt-2.5 tracking-tight">
          Daftar Member Baru
        </h1>
        <p className="text-[12px] text-[var(--mut)]">
          Dapatkan bonus poin & reward spesial di Kopi Nuri
        </p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--line)] rounded-[22px] p-6 shadow-sm">
        {errors.general && (
          <div className="bg-[var(--badbg)] border border-[var(--bad)]/20 rounded-[12px] p-3 mb-4 text-[12.5px] font-semibold text-[var(--bad)]">
            {errors.general}
          </div>
        )}

        <div className="space-y-3.5">
          {/* Nama */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Masukkan nama Anda"
              className={`w-full border rounded-[12px] px-3.5 py-2.5 text-[13.5px] bg-[var(--in)] text-[var(--ink)] focus:outline-none ${
                errors.name
                  ? "border-[var(--bad)]"
                  : "border-[var(--line)] focus:border-[var(--brand)]"
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-[var(--bad)] mt-1 font-semibold">
                {errors.name}
              </p>
            )}
          </div>

          {/* HP */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1">
              Nomor WhatsApp *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              placeholder="08xx atau 62xx"
              className={`w-full border rounded-[12px] px-3.5 py-2.5 text-[13.5px] bg-[var(--in)] text-[var(--ink)] focus:outline-none ${
                errors.phone
                  ? "border-[var(--bad)]"
                  : "border-[var(--line)] focus:border-[var(--brand)]"
              }`}
            />
            {errors.phone && (
              <p className="text-[11px] text-[var(--bad)] mt-1 font-semibold">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1">
              Email (opsional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="email@contoh.com"
              className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[var(--brand)]"
            />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1">
              PIN (4-6 digit angka) *
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(e) =>
                  handleFormChange(
                    "pin",
                    e.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="••••••"
                className={`w-full border rounded-[12px] px-3.5 py-2.5 pr-12 text-[13.5px] font-mono tracking-widest bg-[var(--in)] text-[var(--ink)] focus:outline-none ${
                  errors.pin
                    ? "border-[var(--bad)]"
                    : "border-[var(--line)] focus:border-[var(--brand)]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mut)] hover:text-[var(--ink)]"
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.pin && (
              <p className="text-[11px] text-[var(--bad)] mt-1 font-semibold">
                {errors.pin}
              </p>
            )}
          </div>

          {/* Konfirmasi PIN */}
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1">
              Konfirmasi PIN *
            </label>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={form.pinConfirm}
              onChange={(e) =>
                handleFormChange(
                  "pinConfirm",
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="••••••"
              className={`w-full border rounded-[12px] px-3.5 py-2.5 text-[13.5px] font-mono tracking-widest bg-[var(--in)] text-[var(--ink)] focus:outline-none ${
                errors.pinConfirm
                  ? "border-[var(--bad)]"
                  : "border-[var(--line)] focus:border-[var(--brand)]"
              }`}
            />
            {errors.pinConfirm && (
              <p className="text-[11px] text-[var(--bad)] mt-1 font-semibold">
                {errors.pinConfirm}
              </p>
            )}
          </div>

          {/* WhatsApp opt-in */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.waOptIn}
              onChange={(e) => handleFormChange("waOptIn", e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-[4px] accent-[var(--brand)]"
            />
            <span className="text-[12px] text-[var(--mut)] leading-snug">
              Kirim info poin & penawaran spesial lewat WhatsApp
            </span>
          </label>

          <button
            type="button"
            onClick={handleRequestOtp}
            disabled={isPending}
            className="w-full bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-bold shadow-xs hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Lanjutkan ke Verifikasi
          </button>
        </div>
      </div>

      <p className="text-center text-[13px] text-[var(--mut)] mt-6">
        Sudah punya akun member?{" "}
        <Link
          href="/member/login"
          className="text-[var(--brand)] font-bold hover:underline"
        >
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
