import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const rawUrl = process.env.DATABASE_URL || "";
    const maskedUrl = rawUrl.replace(/:[^:@]+@/, ":****@");

    const doReset = req.nextUrl.searchParams.get("reset") === "true";

    let resetResult = null;
    if (doReset) {
      const newAdminHash = await hash("admin123", 12);
      const newKasirHash = await hash("kasir123", 12);

      await prisma.user.updateMany({
        where: { username: "admin" },
        data: { passwordHash: newAdminHash, isActive: true },
      });

      await prisma.user.updateMany({
        where: { username: "kasir" },
        data: { passwordHash: newKasirHash, isActive: true },
      });

      // Clear all login attempts / locks
      await prisma.loginAttempt.deleteMany();

      resetResult = "Password admin & kasir berhasil direset ke admin123 & kasir123, dan login attempts dibersihkan!";
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    const adminUser = users.find((u) => u.username === "admin");
    let adminPasswordMatch = false;
    if (adminUser) {
      adminPasswordMatch = await compare("admin123", adminUser.passwordHash);
    }

    const kasirUser = users.find((u) => u.username === "kasir");
    let kasirPasswordMatch = false;
    if (kasirUser) {
      kasirPasswordMatch = await compare("kasir123", kasirUser.passwordHash);
    }

    const attempts = await prisma.loginAttempt.findMany();

    return NextResponse.json({
      ok: true,
      databaseUrlMasked: maskedUrl,
      resetResult,
      userCount: users.length,
      users: users.map((u) => ({
        username: u.username,
        role: u.role,
        isActive: u.isActive,
      })),
      adminFound: !!adminUser,
      adminPasswordMatch,
      kasirFound: !!kasirUser,
      kasirPasswordMatch,
      attempts,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
