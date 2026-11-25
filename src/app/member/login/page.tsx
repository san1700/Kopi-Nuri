"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginMember } from "@/app/actions/member-portal";
import { toast } from "sonner";
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
    <div className="flex flex-col min-h-screen p-6 justify-center">
      <div className="mb-10">
        <Image
          src="/logo.png"
          alt="Kopi Nuri"
          width={140}
          height={56}
          className="mx-auto object-contain"
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-800 mb-1">Masuk Portal Member</h1>
        <p className="text-sm text-stone-500 mb-6">Gunakan HP dan PIN yang kamu daftarkan</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Nomor HP
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xx atau 62xx"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1F5C2E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              PIN
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-[#1F5C2E]"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-[#1F5C2E] text-white rounded-xl py-3 font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Masuk
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-stone-500 mt-6">
        Belum punya akun?{" "}
        <a href="/member/daftar" className="text-[#1F5C2E] font-semibold">
          Daftar gratis
        </a>
      </p>

      <p className="text-center text-xs text-stone-400 mt-8">
        Kopi Nuri — Coffee &amp; Space
      </p>
    </div>
  );
}

