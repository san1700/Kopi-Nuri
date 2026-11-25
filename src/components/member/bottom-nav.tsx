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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-stone-200 z-40">
      <div className="flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active
                  ? "text-[#1F5C2E]"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-2"}`}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

