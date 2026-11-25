"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Gift,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  TicketCheck,
  MessageCircle,
  FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
  { label: "Member", href: "/admin/member", icon: <Users size={20} /> },
  { label: "Kasir Transaksi", href: "/kasir", icon: <ScanLine size={20} /> },
  { label: "Tukar Reward", href: "/kasir/tukar", icon: <Gift size={20} /> },
  {
    label: "Validasi Voucher",
    href: "/kasir/voucher",
    icon: <TicketCheck size={20} />,
  },
  { label: "Katalog Reward", href: "/admin/reward", icon: <Gift size={20} /> },
  {
    label: "Riwayat Poin",
    href: "/admin/riwayat",
    icon: <History size={20} />,
  },
  {
    label: "Laporan",
    href: "/admin/laporan",
    icon: <FileSpreadsheet size={20} />,
  },
  {
    label: "WhatsApp",
    href: "/admin/whatsapp",
    icon: <MessageCircle size={20} />,
  },
  {
    label: "Pengaturan",
    href: "/admin/pengaturan",
    icon: <Settings size={20} />,
  },
];

const cashierNav: NavItem[] = [
  { label: "Kasir Transaksi", href: "/kasir", icon: <ScanLine size={20} /> },
  { label: "Tukar Reward", href: "/kasir/tukar", icon: <Gift size={20} /> },
  {
    label: "Validasi Voucher",
    href: "/kasir/voucher",
    icon: <TicketCheck size={20} />,
  },
  {
    label: "Riwayat Poin",
    href: "/kasir/riwayat",
    icon: <History size={20} />,
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const nav = role === "ADMIN" ? adminNav : cashierNav;

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-60"
      } bg-white dark:bg-kopi-dark-card border-r border-gray-100 dark:border-gray-800
        flex flex-col h-screen sticky top-0 transition-[width] duration-200`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <Image
          src="/logo.png"
          alt="Kopi Nuri"
          width={36}
          height={36}
          className="shrink-0 object-contain"
        />
        {!collapsed && (
          <span className="font-bold text-kopi-green dark:text-kopi-olive text-sm tracking-wide">
            KOPI NURI
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/kasir" &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${
                  isActive
                    ? "bg-kopi-green/10 text-kopi-green dark:bg-kopi-green/20 dark:text-kopi-olive"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }
                ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-gray-100 dark:border-gray-800
                   text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label={collapsed ? "Perlebar sidebar" : "Perkecil sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}

