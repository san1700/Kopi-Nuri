import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || "";
    // Mask password
    const maskedUrl = rawUrl.replace(/:[^:@]+@/, ":****@");

    // 1. Check raw connection
    const dbNow = await prisma.$queryRaw`SELECT NOW() as now`;

    // 2. Count & list users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    // 3. Test admin password
    const adminUser = users.find((u) => u.username === "admin");
    let adminPasswordMatch = false;
    if (adminUser) {
      adminPasswordMatch = await compare("admin123", adminUser.passwordHash);
    }

    // 4. Check login attempts
    const attempts = await prisma.loginAttempt.findMany();

    return NextResponse.json({
      ok: true,
      databaseUrlMasked: maskedUrl,
      dbNow,
      userCount: users.length,
      users: users.map((u) => ({
        username: u.username,
        role: u.role,
        isActive: u.isActive,
      })),
      adminFound: !!adminUser,
      adminPasswordMatch,
      attempts,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        stack: error.stack,
        databaseUrlMasked: (process.env.DATABASE_URL || "").replace(
          /:[^:@]+@/,
          ":****@"
        ),
      },
      { status: 500 }
    );
  }
}
