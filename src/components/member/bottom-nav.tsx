"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Gift, Ticket, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/member/beranda", label: "Beranda", icon: Home },
  { href: "/member/riwayat", label: "Riwayat", icon: List },
  { href: "/member/reward", label: "Reward", icon: Gift },
  { href: "/member/voucher", label: "Voucher", icon: Ticket },
  { href: "/member/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi Member"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:max-w-md bg-[var(--card)]/95 backdrop-blur-md border-t border-[var(--line)] z-40 shadow-[0_-4px_24px_rgba(16,51,31,0.06)]"
      style={{
        paddingBottom: "max(0.625rem, env(safe-area-inset-bottom, 0.625rem))",
      }}
    >
      <div className="grid grid-cols-5 items-center px-1.5 pt-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-[12px] transition-all relative ${
                active
                  ? "text-[var(--brand)] font-bold"
                  : "text-[var(--mut)] hover:text-[var(--ink)] font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-[10px] transition-all flex items-center justify-center ${
                  active ? "bg-[var(--mint)]" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active ? "stroke-[2.5]" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span className="text-[10.5px] leading-tight mt-0.5 tracking-tight truncate max-w-full">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
