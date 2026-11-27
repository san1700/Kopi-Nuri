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
  Save,
  UserPlus,
  KeyRound,
  Info,
  Loader2,
  X,
} from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusPill,
  FormField,
} from "@/components/ui/kopi-ui";

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

  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Atur aturan poin, level member, WhatsApp, dan akun staf."
        actions={
          <span className="inline-flex items-center gap-2 font-semibold text-[13px] px-3.5 py-2 rounded-[12px] bg-[var(--warnbg)] text-[var(--warn)]">
            <Info size={16} />
            Berlaku untuk transaksi berikutnya
          </span>
        }
      />

      {/* Form 3 Kolom Pengaturan */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom 1: Aturan Poin */}
          <div className="space-y-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)] pb-2 border-b border-[var(--line)]">
              Aturan poin &amp; penukaran
            </h2>
            <FormField label="Unit belanja (Rp)" hint="earn_rupiah_unit">
              <input
                type="number"
                min={1000}
                value={settings.earn_rupiah_unit}
                onChange={(e) => updateField("earn_rupiah_unit", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Poin per unit" hint="earn_points_per_unit">
              <input
                type="number"
                min={1}
                value={settings.earn_points_per_unit}
                onChange={(e) => updateField("earn_points_per_unit", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Bonus daftar" hint="signup_bonus">
              <input
                type="number"
                min={0}
                value={settings.signup_bonus}
                onChange={(e) => updateField("signup_bonus", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Minimal tukar poin" hint="redeem_min_points">
              <input
                type="number"
                min={1}
                value={settings.redeem_min_points}
                onChange={(e) => updateField("redeem_min_points", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
          </div>

          {/* Kolom 2: Level Member */}
          <div className="space-y-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)] pb-2 border-b border-[var(--line)]">
              Ambang level member
            </h2>
            <FormField label="Minimum silver" hint="level_silver_min">
              <input
                type="number"
                min={0}
                value={settings.level_silver_min}
                onChange={(e) => updateField("level_silver_min", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Minimum gold" hint="level_gold_min">
              <input
                type="number"
                min={1}
                value={settings.level_gold_min}
                onChange={(e) => updateField("level_gold_min", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Minimum platinum" hint="level_platinum_min">
              <input
                type="number"
                min={2}
                value={settings.level_platinum_min}
                onChange={(e) => updateField("level_platinum_min", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
          </div>

          {/* Kolom 3: Parameter WhatsApp */}
          <div className="space-y-3.5">
            <h2 className="text-[16px] font-bold text-[var(--ink)] pb-2 border-b border-[var(--line)]">
              Parameter WhatsApp comeback
            </h2>
            <FormField label="Batas hari tidak aktif" hint="wa_inactive_days">
              <input
                type="number"
                min={1}
                value={settings.wa_inactive_days}
                onChange={(e) => updateField("wa_inactive_days", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
            <FormField label="Cooldown kirim WA (hari)" hint="wa_cooldown_days">
              <input
                type="number"
                min={1}
                value={settings.wa_cooldown_days}
                onChange={(e) => updateField("wa_cooldown_days", e.target.value)}
                className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-[var(--line)]">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-5 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan pengaturan
          </button>
        </div>
      </form>

      {/* Kelola User Kasir */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 mt-4">
        <form
          onSubmit={handleCreateCashier}
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] space-y-3.5"
          style={{ boxShadow: "var(--sh)" }}
        >
          <h2 className="text-[16px] font-bold text-[var(--ink)]">
            Tambah user kasir
          </h2>

          <FormField label="Nama lengkap">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Kasir Shift Siang"
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            />
          </FormField>

          <FormField label="Username">
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="kasir2"
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            />
          </FormField>

          <FormField label="Password awal" hint="Minimal 6 karakter">
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••"
              className="border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
            />
          </FormField>

          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 bg-[var(--btn)] text-white rounded-[12px] py-3 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Buat akun kasir
          </button>
        </form>

        <div
          className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px]"
          style={{ boxShadow: "var(--sh)" }}
        >
          <h2 className="text-[16px] font-bold text-[var(--ink)] mb-3.5">
            Daftar akun staf ({initialUsers.length})
          </h2>

          <DataTable
            columns={["Nama", "Username", "Role", "Status", "Aksi"]}
            isEmpty={initialUsers.length === 0}
            empty={<p className="text-center text-[var(--mut)] py-6">Belum ada akun staf.</p>}
          >
            {initialUsers.map((u) => (
              <tr key={u.id}>
                <td className="px-3.5 py-3 font-medium text-[var(--ink)]">{u.name}</td>
                <td className="px-3.5 py-3 font-mono text-[13px] text-[var(--mut)]">
                  {u.username}
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill variant={u.role === "ADMIN" ? "warn" : "neutral"}>
                    {u.role === "ADMIN" ? "Admin" : "Cashier"}
                  </StatusPill>
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </StatusPill>
                </td>
                <td className="px-3.5 py-3 whitespace-nowrap">
                  {u.role === "CASHIER" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(u);
                          setResetPass("");
                        }}
                        className="inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-semibold cursor-pointer"
                      >
                        <KeyRound size={13} /> Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 border border-[var(--line)] bg-[var(--card)] rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-semibold cursor-pointer ${
                          u.isActive ? "text-[var(--bad)]" : "text-[var(--brand)]"
                        }`}
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[12.5px] text-[var(--mut)]">Admin utama</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>

      {/* Modal Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] max-w-sm w-full p-6 space-y-4"
            style={{ boxShadow: "var(--sh)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--ink)]">
                Reset password kasir
              </h3>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="text-[var(--mut)] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-[var(--mut)]">
              Reset password untuk <b className="text-[var(--ink)]">{resetTarget.name}</b> (
              {resetTarget.username}).
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={resetPass}
                onChange={(e) => setResetPass(e.target.value)}
                placeholder="Password baru (min 6 karakter)"
                className="w-full border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 text-[13.5px] font-semibold text-[var(--mut)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[var(--btn)] text-white rounded-[12px] px-4 py-2 text-[13.5px] font-semibold cursor-pointer disabled:opacity-50"
                >
                  Simpan password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
