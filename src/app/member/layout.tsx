import type { Metadata, Viewport } from "next";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1C15" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

interface Props {
  children: React.ReactNode;
}

export default async function MemberLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex justify-center selection:bg-[var(--mint)] selection:text-[var(--brand)]">
      {/* 
        Container presisi untuk mobile:
        - Layar mobile (<640px): 100% edge-to-edge (w-full) tanpa batas buatan
        - Layar tablet/desktop (>=640px): sm:max-w-md terpusat dengan frame rapi
      */}
      <div className="w-full sm:max-w-md min-h-screen bg-[var(--bg)] relative flex flex-col pt-[env(safe-area-inset-top,0px)]">
        <SwRegister />
        <Toaster position="top-center" richColors />
        {children}
      </div>
    </div>
  );
}
