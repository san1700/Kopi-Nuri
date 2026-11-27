"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loginMember } from "@/app/actions/member-portal";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function MemberLoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPin, setShowPin] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    if (!phone.trim() || !pin.trim()) {
      setError("Nomor HP dan PIN wajib diisi");
      return;
    }
    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("phone", phone.trim());
      fd.set("pin", pin.trim());
      const result = await loginMember(fd);
      if (!result.success) {
        setError(result.error || "Login gagal");
        return;
      }
      router.push("/member/beranda");
    });
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-8 justify-center">
      {/* Logo Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-[16px] bg-white p-2 border border-[var(--line)] shadow-md flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Logo Kopi Nuri"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-[20px] font-extrabold text-[var(--ink)] mt-3 tracking-tight">
          Kopi Nuri
        </h1>
        <p className="text-[12.5px] text-[var(--mut)]">Sistem Poin Member</p>
      </div>

      {/* Kartu Form Login */}
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-[22px] p-6 shadow-sm">
        <h2 className="text-[17px] font-extrabold text-[var(--ink)] mb-1">
          Masuk Portal Member
        </h2>
        <p className="text-[12.5px] text-[var(--mut)] mb-5">
          Gunakan nomor WhatsApp dan PIN Anda
        </p>

        {error && (
          <div className="bg-[var(--badbg)] border border-[var(--bad)]/20 rounded-[12px] p-3 mb-4 text-[12.5px] font-semibold text-[var(--bad)]">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xx atau 62xx"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[var(--ink)] mb-1.5">
              PIN (6 angka)
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••••"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 pr-12 text-[14px] font-mono tracking-widest focus:outline-none focus:border-[var(--brand)]"
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
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-bold shadow-xs hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Masuk ke Portal
          </button>
        </div>
      </div>

      <p className="text-center text-[13px] text-[var(--mut)] mt-6">
        Belum terdaftar sebagai member?{" "}
        <Link
          href="/member/daftar"
          className="text-[var(--brand)] font-bold hover:underline"
        >
          Daftar sekarang
        </Link>
      </p>

      <p className="text-center text-[11px] text-[var(--mut)] mt-8">
        Kopi Nuri Coffee &amp; Space
      </p>
    </div>
  );
}
