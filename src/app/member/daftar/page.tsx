"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { requestMemberOtp, verifyOtpAndRegister } from "@/app/actions/member-portal";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle, PartyPopper } from "lucide-react";

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
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Nama minimal 2 karakter";
    if (!form.phone.trim() || form.phone.trim().length < 8) e.phone = "Nomor HP minimal 8 digit";
    if (!/^\d{4,6}$/.test(form.pin)) e.pin = "PIN harus 4-6 digit angka";
    if (form.pin !== form.pinConfirm) e.pinConfirm = "Konfirmasi PIN tidak cocok";
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
        setOtpState((prev) => prev ? { ...prev, simulatedOtp: result.simulatedOtp } : prev);
        startCooldown();
        toast.success("Kode OTP baru telah dikirim");
      } else {
        toast.error(result.error || "Gagal kirim ulang OTP");
      }
    });
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <PartyPopper className="w-16 h-16 text-[#1F5C2E]" />
          <h1 className="text-2xl font-bold text-stone-800">Selamat Bergabung!</h1>
          <p className="text-stone-600">
            Kamu mendapatkan{" "}
            <span className="font-bold text-[#1F5C2E]">{bonusPoints} poin</span>{" "}
            bonus pendaftaran!
          </p>
        </div>
        <button
          onClick={() => router.push("/member/beranda")}
          className="w-full bg-[#1F5C2E] text-white rounded-xl py-3 font-semibold text-base hover:bg-[#174d25] transition-colors"
        >
          Lihat Kartu Saya →
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col min-h-screen p-6">
        <div className="mb-8 mt-8">
          <Image src="/logo.png" alt="Kopi Nuri" width={120} height={48} className="mx-auto object-contain" />
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-stone-800 mb-1">Verifikasi OTP</h2>
          <p className="text-sm text-stone-500 mb-6">
            Kode OTP telah dikirim ke <strong>{otpState?.phone}</strong>
          </p>

          {/* Mode simulasi banner */}
          {otpState?.simulatedOtp && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-amber-700 mb-1">🔧 Mode Simulasi</p>
              <p className="text-sm text-amber-800">
                Kode OTP kamu:{" "}
                <span className="font-bold text-lg tracking-widest">
                  {otpState.simulatedOtp}
                </span>
              </p>
              <p className="text-xs text-amber-600 mt-1">
                (Kode ini akan diganti dengan pengiriman WhatsApp saat live)
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Kode OTP (6 digit)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold focus:outline-none focus:border-[#1F5C2E]"
            />
          </div>

          <button
            onClick={handleVerifyAndRegister}
            disabled={isPending || otpInput.length !== 6}
            className="w-full bg-[#1F5C2E] text-white rounded-xl py-3 font-semibold mb-3 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Verifikasi & Daftar
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || isPending}
            className="w-full text-[#1F5C2E] text-sm py-2 disabled:text-stone-400"
          >
            {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : "Kirim ulang kode"}
          </button>

          <button
            onClick={() => setStep("form")}
            className="w-full text-stone-500 text-sm py-2 mt-1"
          >
            ← Ubah data
          </button>
        </div>
      </div>
    );
  }

  // Step: form
  return (
    <div className="flex flex-col min-h-screen p-6 pb-8">
      <div className="mb-6 mt-8">
        <Image src="/logo.png" alt="Kopi Nuri" width={120} height={48} className="mx-auto object-contain" />
      </div>

      <h2 className="text-xl font-bold text-stone-800 mb-1">Daftar Member</h2>
      <p className="text-sm text-stone-500 mb-6">Dapatkan poin di setiap transaksi</p>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      <div className="space-y-4 flex-1">
        {/* Nama */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nama Lengkap *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleFormChange("name", e.target.value)}
            placeholder="Nama kamu"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none ${errors.name ? "border-red-400" : "border-stone-300 focus:border-[#1F5C2E]"}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* HP */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nomor HP *</label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => handleFormChange("phone", e.target.value)}
            placeholder="08xx atau 62xx"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none ${errors.phone ? "border-red-400" : "border-stone-300 focus:border-[#1F5C2E]"}`}
          />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email (opsional)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleFormChange("email", e.target.value)}
            placeholder="email@contoh.com"
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F5C2E]"
          />
        </div>

        {/* PIN */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">PIN (4-6 digit) *</label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={form.pin}
              onChange={(e) => handleFormChange("pin", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className={`w-full border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none ${errors.pin ? "border-red-400" : "border-stone-300 focus:border-[#1F5C2E]"}`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.pin && <p className="text-xs text-red-500 mt-1">{errors.pin}</p>}
        </div>

        {/* Konfirmasi PIN */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Konfirmasi PIN *</label>
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            maxLength={6}
            value={form.pinConfirm}
            onChange={(e) => handleFormChange("pinConfirm", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none ${errors.pinConfirm ? "border-red-400" : "border-stone-300 focus:border-[#1F5C2E]"}`}
          />
          {errors.pinConfirm && <p className="text-xs text-red-500 mt-1">{errors.pinConfirm}</p>}
        </div>

        {/* WhatsApp opt-in */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.waOptIn}
            onChange={(e) => handleFormChange("waOptIn", e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#1F5C2E]"
          />
          <span className="text-sm text-stone-600">
            Saya setuju menerima informasi & penawaran via WhatsApp
          </span>
        </label>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={handleRequestOtp}
          disabled={isPending}
          className="w-full bg-[#1F5C2E] text-white rounded-xl py-3 font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Kirim Kode OTP
        </button>
        <p className="text-center text-sm text-stone-500">
          Sudah punya akun?{" "}
          <a href="/member/login" className="text-[#1F5C2E] font-semibold">
            Masuk
          </a>
        </p>
      </div>
    </div>
  );
}

