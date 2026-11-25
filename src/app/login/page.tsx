"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    <div className="min-h-screen flex items-center justify-center bg-kopi-cream dark:bg-kopi-dark-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Kopi Nuri"
            width={180}
            height={180}
            priority
            className="object-contain"
          />
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-kopi-dark-card rounded-2xl shadow-lg p-8">
          <h1 className="text-xl font-bold text-center text-kopi-green dark:text-kopi-olive mb-6">
            Masuk ke Sistem
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-kopi-green focus:border-transparent
                           transition-colors"
                placeholder="Masukkan username"
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                           bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-kopi-green focus:border-transparent
                           transition-colors"
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-kopi-coral bg-red-50 dark:bg-red-950 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-kopi-green hover:bg-kopi-green/90 disabled:opacity-50
                         text-white font-semibold rounded-lg transition-colors
                         focus:ring-2 focus:ring-kopi-green focus:ring-offset-2"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
          Kopi Nuri — Coffee &amp; Space
        </p>
      </div>
    </div>
  );
}

