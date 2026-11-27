import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

// Member routes handled outside NextAuth
function handleMemberRoute(req: NextRequest): NextResponse | null {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  if (!pathname.startsWith("/member")) return null;

  // Public member routes
  if (
    pathname === "/member/login" ||
    pathname === "/member/daftar" ||
    pathname.startsWith("/member/daftar/")
  ) {
    return NextResponse.next();
  }

  // Check member session cookie (JWT, not NextAuth)
  const memberToken = req.cookies.get("kopi_nuri_member_session");
  if (!memberToken?.value) {
    return NextResponse.redirect(new URL("/member/login", nextUrl));
  }
  return NextResponse.next();
}

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Handle /member/* first (separate auth system)
  const memberResponse = handleMemberRoute(req as NextRequest);
  if (memberResponse) return memberResponse;

  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Halaman login: redirect jika sudah login
  if (pathname === "/login") {
    if (isLoggedIn) {
      const redirectTo = role === "ADMIN" ? "/admin" : "/kasir";
      return NextResponse.redirect(new URL(redirectTo, nextUrl));
    }
    return NextResponse.next();
  }

  // Proteksi /admin/*: hanya ADMIN
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/kasir", nextUrl));
    }
    return NextResponse.next();
  }

  // Proteksi /kasir/*: ADMIN dan CASHIER
  if (pathname.startsWith("/kasir")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (role !== "ADMIN" && role !== "CASHIER") {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  // Root: redirect ke halaman sesuai role
  if (pathname === "/") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    const redirectTo = role === "ADMIN" ? "/admin" : "/kasir";
    return NextResponse.redirect(new URL(redirectTo, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|api/wa|_next/static|_next/image|favicon.ico|logo.png|icon-192.png|icon-512.png|manifest.json|sw.js).*)",
  ],
};

