"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Username atau password salah");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--side)] px-4 py-8">
      <div className="w-full max-w-[380px]">
        {/* Logo di atas kartu */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-[16px] bg-white p-1.5 shadow-md flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo Kopi Nuri"
              width={56}
              height={56}
              priority
              className="object-contain"
            />
          </div>
          <b className="text-white text-[18px] font-extrabold mt-3">Kopi Nuri</b>
          <span className="text-[#8FB09A] text-[13px]">Sistem Poin Member</span>
        </div>

        {/* Kartu putih di tengah */}
        <div className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] p-7 shadow-xl">
          <h1 className="text-[20px] font-extrabold text-[var(--ink)] text-center mb-1">
            Masuk ke sistem
          </h1>
          <p className="text-[13px] text-[var(--mut)] text-center mb-5">
            Gunakan akun Admin atau Kasir
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="grid gap-1.5 font-semibold text-[13px] text-[var(--ink)]">
              <span>Username</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
                placeholder="Masukkan username"
                autoComplete="username"
                required
                autoFocus
              />
            </label>

            <label className="grid gap-1.5 font-semibold text-[13px] text-[var(--ink)]">
              <span>Password</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div className="rounded-[12px] bg-[var(--badbg)] text-[var(--bad)] px-3.5 py-2.5 text-[13px] font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
