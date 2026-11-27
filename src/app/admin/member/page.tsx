"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
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
import {
  PageHeader,
  DataTable,
  StatusPill,
  EmptyState,
} from "@/components/ui/kopi-ui";

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

  const [selectedForCard, setSelectedForCard] = useState<MemberItem | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  function levelVariant(level: MemberLevel) {
    if (level === "Platinum") return "success" as const;
    if (level === "Gold") return "warn" as const;
    return "neutral" as const;
  }

  return (
    <div>
      <PageHeader
        title="Data member"
        subtitle={`Total ${totalCount} member terdaftar di program loyalty Kopi Nuri.`}
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingMember(null);
              setFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[var(--btn)] text-white rounded-[12px] px-4 py-2.5 text-[14px] font-semibold cursor-pointer hover:opacity-95 transition-opacity"
          >
            <UserPlus size={17} />
            Tambah member baru
          </button>
        }
      />

      {/* Pencarian & Segarkan */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode (MBR-…), atau nomor HP"
            className="flex-1 min-w-[220px] border border-[var(--line)] bg-[var(--in)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--brand)]"
          />
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2.5 text-[14px] font-semibold cursor-pointer disabled:opacity-50"
            style={{ boxShadow: "var(--sh)" }}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Tabel Member */}
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-[20px] px-5 py-[18px] mt-4"
        style={{ boxShadow: "var(--sh)" }}
      >
        {loading ? (
          <div className="py-12 text-center text-[var(--mut)]">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[var(--brand)]" />
            Memuat data member...
          </div>
        ) : (
          <DataTable
            columns={[
              "Kode",
              "Nama & kontak",
              "Saldo poin",
              "Level",
              "Sumber",
              "Status",
              "Terdaftar",
              "Aksi",
            ]}
            isEmpty={members.length === 0}
            empty={
              <EmptyState
                icon={<Users size={24} />}
                title="Belum ada member"
                description="Klik “Tambah member baru” untuk mendaftarkan yang pertama."
              />
            }
          >
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-[var(--bg)]/50 transition-colors">
                <td className="px-3.5 py-3 font-mono font-bold text-[13px] text-[var(--brand)] whitespace-nowrap">
                  {m.code}
                </td>
                <td className="px-3.5 py-3">
                  <b className="text-[var(--ink)]">{m.name}</b>
                  <div className="text-[12.5px] text-[var(--mut)]">
                    {formatPhoneDisplay(m.phone)}
                  </div>
                </td>
                <td className="px-3.5 py-3 font-bold text-[var(--ink)] whitespace-nowrap">
                  {m.balance.toLocaleString("id-ID")}
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill variant={levelVariant(m.level)}>{m.level}</StatusPill>
                </td>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                  {m.source === "ADMIN" ? "Kasir" : "Mandiri"}
                </td>
                <td className="px-3.5 py-3">
                  <StatusPill variant={m.isActive ? "success" : "neutral"}>
                    {m.isActive ? "Aktif" : "Nonaktif"}
                  </StatusPill>
                </td>
                <td className="px-3.5 py-3 text-[13px] text-[var(--mut)] whitespace-nowrap">
                  {formatTanggal(m.createdAt)}
                </td>
                <td className="px-3.5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedForCard(m)}
                      className="p-2 rounded-[10px] text-[var(--mut)] hover:text-[var(--brand)] hover:bg-[var(--mint)] transition-colors cursor-pointer"
                      title="Lihat & Cetak Kartu QR"
                    >
                      <QrCode size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(m);
                        setFormModalOpen(true);
                      }}
                      className="p-2 rounded-[10px] text-[var(--mut)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                      title="Edit Data Member"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      disabled={togglingId === m.id}
                      className={`p-2 rounded-[10px] transition-colors cursor-pointer ${
                        m.isActive
                          ? "text-[var(--mut)] hover:text-[var(--bad)] hover:bg-[var(--badbg)]"
                          : "text-[var(--bad)] hover:text-[var(--brand)] hover:bg-[var(--mint)]"
                      }`}
                      title={m.isActive ? "Nonaktifkan Member" : "Aktifkan Member"}
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {/* Paginasi */}
        <div className="pt-4 mt-2 border-t border-[var(--line)] flex items-center justify-between text-[12.5px] text-[var(--mut)]">
          <span>
            Menampilkan halaman <b className="text-[var(--ink)]">{page}</b> dari{" "}
            <b className="text-[var(--ink)]">{totalPages || 1}</b>
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 border border-[var(--line)] rounded-[10px] bg-[var(--card)] text-[var(--ink)] disabled:opacity-40 cursor-pointer"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 border border-[var(--line)] rounded-[10px] bg-[var(--card)] text-[var(--ink)] disabled:opacity-40 cursor-pointer"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedForCard && (
        <MemberCardModal
          member={selectedForCard}
          onClose={() => setSelectedForCard(null)}
        />
      )}

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
