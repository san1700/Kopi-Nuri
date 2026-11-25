import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk — Kopi Nuri",
  description: "Login ke sistem poin member Kopi Nuri",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

