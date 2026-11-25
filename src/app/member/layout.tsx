import type { Metadata, Viewport } from "next";
import { getMemberSession } from "@/lib/member-auth";
import { redirect } from "next/navigation";
import { SwRegister } from "@/app/member/sw-register";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Kopi Nuri — Portal Member",
  description: "Program loyalitas Kopi Nuri Coffee & Space",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Kopi Nuri",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F5C2E",
};

interface Props {
  children: React.ReactNode;
}

export default async function MemberLayout({ children }: Props) {
  // Server-side session check (layout guard)
  // Note: public routes /login and /daftar bypass this via middleware;
  // but layout is also mounted for them. We skip redirect here and let
  // middleware handle it so the layout doesn't double-redirect.

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center">
      <div
        className="w-full max-w-sm min-h-screen bg-[#FDF8F0] relative flex flex-col"
        style={{ boxShadow: "0 0 40px rgba(0,0,0,0.12)" }}
      >
        <SwRegister />
        <Toaster position="top-center" richColors />
        {children}
      </div>
    </div>
  );
}

