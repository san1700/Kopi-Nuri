"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateSettings,
  createCashier,
  toggleCashierStatus,
  resetCashierPassword,
} from "@/app/actions/pengaturan";
import { toast } from "sonner";
import {
  Settings,
  Users,
  Save,
  UserPlus,
  KeyRound,
  Power,
  Info,
  Loader2,
  X,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "CASHIER";
  isActive: boolean;
  createdAt: string | Date;
  branch: { name: string };
}

interface SettingsState {
  earn_rupiah_unit: string;
  earn_points_per_unit: string;
  signup_bonus: string;
  redeem_min_points: string;
  level_silver_min: string;
  level_gold_min: string;
  level_platinum_min: string;
  wa_inactive_days: string;
  wa_cooldown_days: string;
}

export function PengaturanClient({
  initialSettings,
  initialUsers,
}: {
  initialSettings: SettingsState;
  initialUsers: UserRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<SettingsState>(initialSettings);

  // Form tambah kasir
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Modal reset password
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPass, setResetPass] = useState("");

  function updateField(key: keyof SettingsState, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSettings({ ...settings });
      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan pengaturan");
        return;
      }
      toast.success("Pengaturan berhasil disimpan");
      router.refresh();
    });
  }

  function handleCreateCashier(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newName);
      fd.set("username", newUsername);
      fd.set("password", newPassword);
      const res = await createCashier(fd);
      if (!res.success) {
        toast.error(res.error || "Gagal menambah kasir");
        return;
      }
      toast.success(`Kasir "${newName}" berhasil ditambahkan`);
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      router.refresh();
    });
  }

  function handleToggleStatus(user: UserRow) {
    startTransition(async () => {
      const res = await toggleCashierStatus(user.id);
      if (!res.success) {
        toast.error(res.error || "Gagal mengubah status kasir");
        return;
      }
      toast.success(
        res.isActive
          ? `Kasir ${user.name} diaktifkan`
          : `Kasir ${user.name} dinonaktifkan`
      );
      router.refresh();
    });
  }

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", resetTarget.id);
      fd.set("newPassword", resetPass);
      const res = await resetCashierPassword(fd);
      if (!res.success) {
        toast.error(res.error || "Gagal mereset password");
        return;
      }
      toast.success(`Password kasir ${resetTarget.name} berhasil direset`);
      setResetTarget(null);
      setResetPass("");
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-kopi-green" />
          Pengaturan Sistem &amp; Kasir
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Atur aturan poin, ambang level, parameter WhatsApp, serta kelola akun kasir.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-800">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Catatan:</strong> Perubahan aturan poin hanya berlaku untuk transaksi berikutnya. Transaksi dan mutasi ledger yang sudah tercatat sebelumnya tidak berubah.
        </p>
      </div>

      {/* Form Pengaturan */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white dark:bg-kopi-dark-card rounded-xl p-6 border border-gray-100 dark:border-gray-800 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Grup 1: Poin & Penukaran */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 text-sm">
              Aturan Poin &amp; Penukaran
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Unit Belanja (Rp) — <code>earn_rupiah_unit</code>
              </label>
              <input
                type="number"
                min={1000}
                value={settings.earn_rupiah_unit}
                onChange={(e) => updateField("earn_rupiah_unit", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Poin per Unit — <code>earn_points_per_unit</code>
              </label>
              <input
                type="number"
                min={1}
                value={settings.earn_points_per_unit}
                onChange={(e) => updateField("earn_points_per_unit", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Bonus Daftar — <code>signup_bonus</code>
              </label>
              <input
                type="number"
                min={0}
                value={settings.signup_bonus}
                onChange={(e) => updateField("signup_bonus", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Minimal Tukar Poin — <code>redeem_min_points</code>
              </label>
              <input
                type="number"
                min={1}
                value={settings.redeem_min_points}
                onChange={(e) => updateField("redeem_min_points", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
          </div>

          {/* Grup 2: Level Member */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 text-sm">
              Ambang Level Member
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Minimum Silver — <code>level_silver_min</code>
              </label>
              <input
                type="number"
                min={0}
                value={settings.level_silver_min}
                onChange={(e) => updateField("level_silver_min", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Minimum Gold — <code>level_gold_min</code>
              </label>
              <input
                type="number"
                min={1}
                value={settings.level_gold_min}
                onChange={(e) => updateField("level_gold_min", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Minimum Platinum — <code>level_platinum_min</code>
              </label>
              <input
                type="number"
                min={2}
                value={settings.level_platinum_min}
                onChange={(e) => updateField("level_platinum_min", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
          </div>

          {/* Grup 3: Parameter WhatsApp */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 text-sm">
              Parameter WhatsApp Comeback
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Batas Hari Tidak Aktif — <code>wa_inactive_days</code>
              </label>
              <input
                type="number"
                min={1}
                value={settings.wa_inactive_days}
                onChange={(e) => updateField("wa_inactive_days", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Cooldown Kirim WA (Hari) — <code>wa_cooldown_days</code>
              </label>
              <input
                type="number"
                min={1}
                value={settings.wa_cooldown_days}
                onChange={(e) => updateField("wa_cooldown_days", e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="submit"
            disabled={isPending}
            className="bg-kopi-green hover:bg-kopi-green/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        </div>
      </form>

      {/* Kelola User Kasir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Kasir */}
        <form
          onSubmit={handleCreateCashier}
          className="bg-white dark:bg-kopi-dark-card rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-4"
        >
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-kopi-green" />
            Tambah User Kasir
          </h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Kasir Shift Siang"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="kasir2"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Password Awal (min 6 karakter)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-kopi-green hover:bg-kopi-green/90 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Buat Akun Kasir
          </button>
        </form>

        {/* Tabel Daftar Staf */}
        <div className="lg:col-span-2 bg-white dark:bg-kopi-dark-card rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-kopi-green" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Daftar Akun Staf ({initialUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-50 dark:bg-stone-900/50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {initialUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {u.username}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {u.role === "CASHIER" ? (
                        <>
                          <button
                            onClick={() => {
                              setResetTarget(u);
                              setResetPass("");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border rounded-lg hover:bg-stone-50"
                          >
                            <KeyRound className="w-3 h-3" /> Reset Password
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isPending}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border ${
                              u.isActive
                                ? "text-red-600 border-red-200 hover:bg-red-50"
                                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Admin Utama</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                Reset Password Kasir
              </h3>
              <button onClick={() => setResetTarget(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Reset password untuk <strong>{resetTarget.name}</strong> ({resetTarget.username}).
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={resetPass}
                onChange={(e) => setResetPass(e.target.value)}
                placeholder="Password baru (min 6 karakter)"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-kopi-green text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
