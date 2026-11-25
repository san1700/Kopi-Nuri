"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getMemberHome,
  updateMemberProfile,
  changeMemberPin,
  logoutMember,
} from "@/app/actions/member-portal";
import { BottomNav } from "@/components/member/bottom-nav";
import { toast } from "sonner";
import { Loader2, LogOut, Eye, EyeOff, User, MessageCircle, Lock } from "lucide-react";

interface ProfileData {
  member: {
    id: string;
    name: string;
    memberCode: string;
    phone: string;
    email: string | null;
    waOptIn: boolean;
    createdAt: string | Date;
    source: string;
  };
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProfilPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Profile form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [waOptIn, setWaOptIn] = useState(false);

  // PIN form
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPins, setShowPins] = useState(false);

  useEffect(() => {
    getMemberHome().then((result) => {
      if (result.success && result.data) {
        const m = result.data.member;
        setData({ member: m });
        setName(m.name);
        setEmail(m.email ?? "");
        setWaOptIn(m.waOptIn);
      }
      setLoading(false);
    });
  }, []);

  function handleSaveProfile() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", name.trim());
      fd.set("email", email.trim());
      fd.set("waOptIn", String(waOptIn));
      const result = await updateMemberProfile(fd);
      if (result.success) {
        toast.success("Profil berhasil diperbarui");
        setData((d) => d ? { ...d, member: { ...d.member, name: name.trim(), email: email.trim() || null, waOptIn } } : d);
      } else {
        toast.error(result.error || "Gagal memperbarui profil");
      }
    });
  }

  function handleChangePin() {
    if (!/^\d{4,6}$/.test(newPin)) {
      toast.error("PIN baru harus 4-6 digit angka");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Konfirmasi PIN tidak cocok");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("currentPin", currentPin);
      fd.set("newPin", newPin);
      const result = await changeMemberPin(fd);
      if (result.success) {
        toast.success("PIN berhasil diubah");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        toast.error(result.error || "Gagal mengubah PIN");
      }
    });
  }

  function handleLogout() {
    startTransition(async () => {
      await logoutMember();
      router.push("/member/login");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#1F5C2E]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen pb-24">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 border-b border-stone-100">
          <h1 className="text-lg font-bold text-stone-800">Profil</h1>
          {data && (
            <p className="text-xs text-stone-400 mt-0.5">
              {data.member.memberCode} · Bergabung {formatDate(data.member.createdAt)}
            </p>
          )}
        </div>

        <div className="px-4 pt-5 space-y-5">
          {/* Info Profil */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-[#1F5C2E]" />
              <h2 className="text-sm font-semibold text-stone-700">Informasi Akun</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F5C2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Email (opsional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F5C2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Nomor HP</label>
                <input
                  type="tel"
                  value={data?.member.phone ?? ""}
                  disabled
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-stone-50 text-stone-400"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isPending}
                className="w-full bg-[#1F5C2E] text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </section>

          {/* WhatsApp Toggle */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-semibold text-stone-700">Notifikasi WhatsApp</h2>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-stone-600 leading-snug pr-4">
                Terima informasi & penawaran via WhatsApp
              </span>
              <button
                role="switch"
                aria-checked={waOptIn}
                onClick={() => setWaOptIn(!waOptIn)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  waOptIn ? "bg-[#1F5C2E]" : "bg-stone-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    waOptIn ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            {waOptIn !== data?.member.waOptIn && (
              <button
                onClick={handleSaveProfile}
                disabled={isPending}
                className="w-full mt-3 bg-[#1F5C2E] text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50"
              >
                Simpan
              </button>
            )}
          </section>

          {/* Ganti PIN */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-[#1F5C2E]" />
              <h2 className="text-sm font-semibold text-stone-700">Ganti PIN</h2>
              <button
                type="button"
                onClick={() => setShowPins(!showPins)}
                className="ml-auto text-stone-400"
              >
                {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">PIN Saat Ini</label>
                <input
                  type={showPins ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F5C2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">PIN Baru</label>
                <input
                  type={showPins ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F5C2E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Konfirmasi PIN Baru</label>
                <input
                  type={showPins ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1F5C2E]"
                />
              </div>

              <button
                onClick={handleChangePin}
                disabled={isPending || !currentPin || !newPin || !confirmPin}
                className="w-full bg-stone-800 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ubah PIN
              </button>
            </div>
          </section>

          {/* Tombol Keluar */}
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>

      <BottomNav />
    </>
  );
}
