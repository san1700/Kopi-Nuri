"use client";

import { useState } from "react";
import { X, UserPlus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMember, updateMember, MemberFormData } from "@/app/actions/member";
import { normalizePhone } from "@/lib/phone";

interface MemberFormModalProps {
  initialData?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    waOptIn?: boolean;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function MemberFormModal({ initialData, onClose, onSuccess }: MemberFormModalProps) {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState(initialData?.name || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [waOptIn, setWaOptIn] = useState(initialData?.waOptIn ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: MemberFormData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        waOptIn,
      };

      if (isEditing && initialData?.id) {
        await updateMember(initialData.id, data);
        toast.success(`Data member ${name} berhasil diperbarui`);
      } else {
        const res = await createMember(data);
        toast.success(`Member baru ${res.member.name} (${res.member.code}) berhasil didaftarkan + 10 Poin Bonus!`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <UserPlus className="text-kopi-green dark:text-kopi-olive" size={20} />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {isEditing ? "Edit Data Member" : "Tambah Member Baru"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-kopi-coral bg-red-50 dark:bg-red-950/60 rounded-lg border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Nama Lengkap <span className="text-kopi-coral">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Nomor WhatsApp / HP <span className="text-kopi-coral">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890 atau 628..."
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
            {phone && (
              <p className="text-[11px] text-gray-500 mt-1">
                Format tersimpan: <span className="font-mono font-medium">{normalizePhone(phone)}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Alamat Email (Opsional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={waOptIn}
                onChange={(e) => setWaOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-sm border-gray-300 text-kopi-green focus:ring-kopi-green"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                Member bersedia menerima pesan WhatsApp (pengingat poin &amp; ajakan kembali ngopi dari Kopi Nuri).
              </span>
            </label>
          </div>

          {!isEditing && (
            <div className="p-3 bg-kopi-green/5 dark:bg-kopi-green/10 rounded-lg text-xs text-kopi-green dark:text-kopi-olive-light">
              🎁 Member baru otomatis mendapatkan <strong>10 Poin Bonus Pendaftaran</strong>.
            </div>
          )}

          {/* Tombol Aksi */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-kopi-green hover:bg-kopi-green/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isEditing ? "Simpan Perubahan" : "Daftarkan Member"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

