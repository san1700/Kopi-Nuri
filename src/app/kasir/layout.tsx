import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kasir — Kopi Nuri",
};

export default async function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "CASHIER") {
    redirect("/login");
  }

  const sidebarRole = session.user.role === "ADMIN" ? "ADMIN" : "CASHIER";

  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50 dark:bg-kopi-dark-bg">
        <Sidebar role={sidebarRole} />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}

