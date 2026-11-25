"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  UserPlus,
  QrCode,
  Edit,
  Power,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getMembersList, toggleMemberActive } from "@/app/actions/member";
import { MemberCardModal } from "@/components/member-card-modal";
import { MemberFormModal } from "@/components/member-form-modal";
import { formatTanggal } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { MemberLevel } from "@/lib/points";
import { toast } from "sonner";

interface MemberItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string | null;
  source: "ADMIN" | "SELF";
  isActive: boolean;
  waOptIn: boolean;
  createdAt: Date | string;
  balance: number;
  level: MemberLevel;
  transactionCount: number;
}

export default function AdminMemberPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [selectedForCard, setSelectedForCard] = useState<MemberItem | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(() => {
    let isMounted = true;
    getMembersList({
      search: debouncedSearch,
      page,
      limit: 10,
    })
      .then((res) => {
        if (isMounted) {
          setMembers(res.members as MemberItem[]);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Gagal memuat data member";
          toast.error(msg);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, page]);

  useEffect(() => {
    return loadData();
  }, [loadData]);

  async function handleToggleActive(member: MemberItem) {
    const actionName = member.isActive ? "menonaktifkan" : "mengaktifkan";
    if (!confirm(`Apakah Anda yakin ingin ${actionName} member ${member.name} (${member.code})?`)) {
      return;
    }

    setTogglingId(member.id);
    try {
      const res = await toggleMemberActive(member.id);
      toast.success(`Member ${member.name} berhasil ${res.isActive ? "diaktifkan" : "dinonaktifkan"}`);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status member";
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  }

  const levelBadges: Record<MemberLevel, string> = {
    Silver: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    Gold: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    Platinum: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold",
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="text-kopi-green dark:text-kopi-olive" />
            Data Member
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total {totalCount} member terdaftar di program loyalty Kopi Nuri
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMember(null);
            setFormModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-kopi-green hover:bg-kopi-green/90 text-white rounded-xl font-semibold text-sm shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus size={18} />
          Tambah Member Baru
        </button>
      </div>

      {/* Filter & Pencarian */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode (MBR-...), atau nomor HP..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-kopi-green focus:border-transparent transition-colors"
          />
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Muat ulang data"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Segarkan
        </button>
      </div>

      {/* Tabel Member */}
      <div className="bg-white dark:bg-kopi-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/75 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3.5">Kode</th>
                <th className="px-5 py-3.5">Nama &amp; Kontak</th>
                <th className="px-5 py-3.5 text-right">Saldo Poin</th>
                <th className="px-5 py-3.5">Level</th>
                <th className="px-5 py-3.5">Sumber</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Terdaftar</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2 text-kopi-green" />
                    Memuat data member...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    Tidak ada member yang ditemukan.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Kode Member */}
                    <td className="px-5 py-4 font-mono font-bold text-xs text-kopi-green dark:text-kopi-olive">
                      {m.code}
                    </td>

                    {/* Nama & Kontak */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{m.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPhoneDisplay(m.phone)}
                      </p>
                    </td>

                    {/* Saldo Poin */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {m.balance.toLocaleString("id-ID")}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">pts</span>
                    </td>

                    {/* Level */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs border ${levelBadges[m.level]}`}
                      >
                        {m.level}
                      </span>
                    </td>

                    {/* Sumber */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {m.source === "ADMIN" ? "Admin" : "Daftar Mandiri"}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          m.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.isActive ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {m.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>

                    {/* Terdaftar */}
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {formatTanggal(m.createdAt)}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedForCard(m)}
                          className="p-1.5 text-gray-500 hover:text-kopi-green dark:hover:text-kopi-olive hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Lihat &amp; Cetak Kartu QR"
                        >
                          <QrCode size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingMember(m);
                            setFormModalOpen(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit Data Member"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(m)}
                          disabled={togglingId === m.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            m.isActive
                              ? "text-gray-400 hover:text-kopi-coral hover:bg-red-50 dark:hover:bg-red-950/40"
                              : "text-kopi-coral hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                          title={m.isActive ? "Nonaktifkan Member" : "Aktifkan Member"}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            Menampilkan halaman <span className="font-semibold text-gray-700 dark:text-gray-300">{page}</span> dari{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{totalPages || 1}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Kartu Member */}
      {selectedForCard && (
        <MemberCardModal
          member={selectedForCard}
          onClose={() => setSelectedForCard(null)}
        />
      )}

      {/* Modal Form Tambah / Edit */}
      {formModalOpen && (
        <MemberFormModal
          initialData={editingMember}
          onClose={() => {
            setFormModalOpen(false);
            setEditingMember(null);
          }}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
