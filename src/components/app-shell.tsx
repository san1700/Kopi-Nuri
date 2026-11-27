"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  History,
  ScanLine,
  Gift,
  TicketCheck,
  FileText,
  MessageCircle,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

function getNavGroups(role: string): NavGroup[] {
  if (role === "ADMIN") {
    return [
      {
        group: "Utama",
        items: [
          { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={19} /> },
          { label: "Member", href: "/admin/member", icon: <Users size={19} /> },
          { label: "Riwayat poin", href: "/admin/riwayat", icon: <History size={19} /> },
        ],
      },
      {
        group: "Transaksi",
        items: [
          { label: "Kasir transaksi", href: "/kasir", icon: <ScanLine size={19} /> },
          { label: "Tukar reward", href: "/kasir/tukar", icon: <Gift size={19} /> },
          { label: "Validasi voucher", href: "/kasir/voucher", icon: <TicketCheck size={19} /> },
        ],
      },
      {
        group: "Kelola",
        items: [
          { label: "Katalog reward", href: "/admin/reward", icon: <Gift size={19} /> },
          { label: "Laporan", href: "/admin/laporan", icon: <FileText size={19} /> },
          { label: "WhatsApp", href: "/admin/whatsapp", icon: <MessageCircle size={19} /> },
          { label: "Pengaturan", href: "/admin/pengaturan", icon: <Settings size={19} /> },
        ],
      },
    ];
  }

  return [
    {
      group: "Utama",
      items: [
        { label: "Riwayat poin", href: "/kasir/riwayat", icon: <History size={19} /> },
      ],
    },
    {
      group: "Transaksi",
      items: [
        { label: "Kasir transaksi", href: "/kasir", icon: <ScanLine size={19} /> },
        { label: "Tukar reward", href: "/kasir/tukar", icon: <Gift size={19} /> },
        { label: "Validasi voucher", href: "/kasir/voucher", icon: <TicketCheck size={19} /> },
      ],
    },
  ];
}

export function AppShell({
  role,
  children,
}: {
  role: "ADMIN" | "CASHIER";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  const navGroups = getNavGroups(role);
  const userName = session?.user?.name || (role === "ADMIN" ? "Administrator" : "Kasir");
  const roleLabel = role === "ADMIN" ? "Admin" : "Kasir";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr] bg-[var(--bg)] text-[var(--ink)]">
      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-[270px] md:w-[260px] md:sticky md:top-0 md:h-screen z-40
          bg-[var(--side)] text-[#CFE3D5] px-3.5 py-5 flex flex-col gap-1 overflow-y-auto overflow-x-hidden
          transition-transform duration-200 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 pt-1 pb-3.5">
          <div className="w-11 h-11 rounded-[12px] bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Logo Kopi Nuri"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <b className="block text-white text-[16px] font-bold leading-tight">
              Kopi Nuri
            </b>
            <small className="text-[#8FB09A] text-[12px]">
              Sistem Poin Member
            </small>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#CFE3D5] hover:bg-white/10"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 space-y-0.5">
          {navGroups.map((group) => (
            <div key={group.group}>
              <div className="text-[12px] font-semibold text-[#7FA38B] px-3 pt-3 pb-1">
                {group.group}
              </div>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    item.href !== "/kasir" &&
                    pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] font-medium transition-colors ${
                      active
                        ? "bg-[var(--side2)] text-white"
                        : "text-[#CFE3D5] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute right-[-14px] top-[9px] bottom-[9px] w-1 rounded-l-[4px] bg-[var(--coral)]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Profile Card */}
        <div className="mt-auto pt-4">
          <div className="bg-[var(--side2)] rounded-[16px] p-3.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--olive)] text-[#10331F] grid place-items-center font-extrabold shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block text-white text-[13px] truncate">{userName}</b>
              <small className="text-[#8FB09A] text-[12px]">{roleLabel}</small>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-[10px] text-[#CFE3D5] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Keluar"
              aria-label="Keluar dari sistem"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="px-4 py-4 md:px-7 md:pt-4 md:pb-10 min-w-0">
        {/* Topbar */}
        <div className="flex items-center gap-2.5 mb-4 text-[var(--mut)]">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden inline-flex items-center gap-1.5 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3 py-2 font-semibold cursor-pointer"
            style={{ boxShadow: "var(--sh)" }}
            aria-label="Buka menu"
          >
            <Menu size={17} />
          </button>
          <span className="text-[13px] font-medium">Sistem Poin Member</span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-[12px] px-3.5 py-2 font-semibold text-[13px] cursor-pointer"
            style={{ boxShadow: "var(--sh)" }}
            aria-label="Ganti tema terang atau gelap"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span>Tema</span>
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}

