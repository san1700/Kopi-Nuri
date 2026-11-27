import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
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
      <AppShell role={sidebarRole}>{children}</AppShell>
    </Providers>
  );
}
