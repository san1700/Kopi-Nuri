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
import {
  Loader2,
  LogOut,
  Eye,
  EyeOff,
  User,
  MessageCircle,
  Lock,
} from "lucide-react";

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

  // Profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [waOptIn, setWaOptIn] = useState(true);

  // PIN form state
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);

  useEffect(() => {
    getMemberHome().then((result) => {
      if (result.success && result.data) {
        const m = (result.data as { member: ProfileData["member"] }).member;
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
      fd.set("name", name);
      fd.set("email", email);
      fd.set("waOptIn", waOptIn ? "true" : "false");

      const result = await updateMemberProfile(fd);
      if (result.success) {
        toast.success("Profil berhasil diperbarui");
      } else {
        toast.error(result.error || "Gagal memperbarui profil");
      }
    });
  }

  function handleChangePin() {
    if (!oldPin || !newPin || !confirmPin) {
      toast.error("Semua kolom PIN wajib diisi");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Konfirmasi PIN baru tidak cocok");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("oldPin", oldPin);
      fd.set("newPin", newPin);
      fd.set("confirmPin", confirmPin);

      const result = await changeMemberPin(fd);
      if (result.success) {
        toast.success("PIN berhasil diubah");
        setOldPin("");
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-[var(--brand)]" />
        <span className="text-[12.5px] text-[var(--mut)]">Memuat profil...</span>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col min-h-screen"
        style={{
          paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom, 1rem))",
        }}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[var(--bg)]/95 backdrop-blur-md z-20 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <h1 className="text-[18px] font-extrabold text-[var(--ink)] tracking-tight">
            Profil Member
          </h1>
          {data && (
            <p className="text-[11.5px] text-[var(--mut)] mt-0.5">
              {data.member.memberCode} · Bergabung {formatDate(data.member.createdAt)}
            </p>
          )}
        </header>

        <div className="px-4 pt-3.5 space-y-3.5">
          {/* Info Akun Section */}
          <section className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4.5 shadow-xs">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center">
                <User className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h2 className="text-[13.5px] font-extrabold text-[var(--ink)]">
                Informasi Akun
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  Email (opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  Nomor HP (Terdaftar)
                </label>
                <input
                  type="tel"
                  value={data?.member.phone ?? ""}
                  disabled
                  className="w-full border border-[var(--line)] bg-[var(--line)]/30 text-[var(--mut)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] cursor-not-allowed"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isPending}
                className="w-full bg-[var(--btn)] text-white rounded-[12px] py-2.5 text-[13px] font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan Profil
              </button>
            </div>
          </section>

          {/* WhatsApp Notification Toggle */}
          <section className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4.5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h2 className="text-[13.5px] font-extrabold text-[var(--ink)]">
                Notifikasi WhatsApp
              </h2>
            </div>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-[12.5px] text-[var(--ink)] font-medium leading-snug pr-4">
                Terima info poin, voucher reward, dan promo spesial via WhatsApp
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={waOptIn}
                onClick={() => setWaOptIn(!waOptIn)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                  waOptIn ? "bg-[var(--brand)]" : "bg-[var(--line)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-xs transition-transform ${
                    waOptIn ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
            {waOptIn !== data?.member.waOptIn && (
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isPending}
                className="w-full mt-3 bg-[var(--btn)] text-white rounded-[12px] py-2 text-[12.5px] font-bold shadow-xs cursor-pointer"
              >
                Simpan Preferensi
              </button>
            )}
          </section>

          {/* Ganti PIN Section */}
          <section className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-4.5 shadow-xs">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--mint)] text-[var(--brand)] flex items-center justify-center">
                <Lock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <h2 className="text-[13.5px] font-extrabold text-[var(--ink)]">
                Ganti PIN Akun
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  PIN Lama (6 angka)
                </label>
                <div className="relative">
                  <input
                    type={showOldPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={oldPin}
                    onChange={(e) =>
                      setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="••••••"
                    className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] font-mono tracking-widest focus:outline-none focus:border-[var(--brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPin(!showOldPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mut)] hover:text-[var(--ink)]"
                  >
                    {showOldPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  PIN Baru (6 angka)
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) =>
                      setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="••••••"
                    className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] font-mono tracking-widest focus:outline-none focus:border-[var(--brand)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mut)] hover:text-[var(--ink)]"
                  >
                    {showNewPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[var(--ink)] mb-1">
                  Konfirmasi PIN Baru
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[13.5px] font-mono tracking-widest focus:outline-none focus:border-[var(--brand)]"
                />
              </div>

              <button
                type="button"
                onClick={handleChangePin}
                disabled={isPending}
                className="w-full bg-[var(--btn)] text-white rounded-[12px] py-2.5 text-[13px] font-bold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Ubah PIN
              </button>
            </div>
          </section>

          {/* Tombol Logout */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full py-3 bg-[var(--badbg)] text-[var(--bad)] border border-[var(--bad)]/20 rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Akun Member
          </button>
        </div>
      </div>

      <BottomNav />
    </>
  );
}
