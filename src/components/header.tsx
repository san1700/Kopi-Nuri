"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  const roleBadge =
    session?.user?.role === "ADMIN" ? "Admin" : "Kasir";

  return (
    <header className="h-14 bg-white dark:bg-kopi-dark-card border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Sistem Poin Member
      </div>

      <div className="flex items-center gap-4">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {roleBadge}
            </p>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-kopi-coral
                       dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-kopi-coral
                       transition-colors"
            title="Keluar"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

