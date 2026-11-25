import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSettingNumber, SETTING_KEYS } from "@/lib/settings";
import { getMemberBalance } from "@/lib/points";
import { sendTemplate } from "@/lib/whatsapp";

const MAX_SEND_PER_RUN = 25;
const DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ambil jam saat ini dalam zona waktu WIB (Asia/Jakarta, 0-23)
 */
function getCurrentWibHour(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  });
  const hour = Number(formatter.format(new Date()));
  return hour === 24 ? 0 : hour;
}

async function handleComebackCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hanya kirim pada jam wajar: 09:00 - 20:00 WIB
  const isDryRun = process.env.WA_DRY_RUN !== "false";
  const wibHour = getCurrentWibHour();
  const forceWindow =
    req.nextUrl.searchParams.get("forceWindow") === "true" && isDryRun;

  if ((wibHour < 9 || wibHour >= 20) && !forceWindow) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Di luar jam kirim wajar (09:00-20:00 WIB). Jam WIB saat ini: ${wibHour}:00`,
      wibHour,
    });
  }

  const [inactiveDays, cooldownDays] = await Promise.all([
    getSettingNumber(SETTING_KEYS.WA_INACTIVE_DAYS).catch(() => 14),
    getSettingNumber(SETTING_KEYS.WA_COOLDOWN_DAYS).catch(() => 30),
  ]);

  const now = new Date();
  const inactiveCutoff = new Date(
    now.getTime() - inactiveDays * 24 * 60 * 60 * 1000
  );
  const cooldownCutoff = new Date(
    now.getTime() - cooldownDays * 24 * 60 * 60 * 1000
  );

  // Pilih member aktif, opt-in WA, tidak berkunjung > wa_inactive_days,
  // dan belum pernah dikirimi WA atau melewati masa cooldown
  const candidates = await prisma.member.findMany({
    where: {
      isActive: true,
      waOptIn: true,
      lastVisitAt: {
        not: null,
        lt: inactiveCutoff,
      },
      OR: [{ lastWaSentAt: null }, { lastWaSentAt: { lt: cooldownCutoff } }],
    },
    orderBy: { lastVisitAt: "asc" },
    take: MAX_SEND_PER_RUN,
    select: {
      id: true,
      code: true,
      name: true,
      phone: true,
      lastVisitAt: true,
      lastWaSentAt: true,
    },
  });

  const templateName =
    process.env.WA_TEMPLATE_COMEBACK || "comeback_template";

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const member = candidates[i];
    const balance = await getMemberBalance(member.id);

    const result = await sendTemplate(
      member.phone,
      templateName,
      [member.name, String(balance)],
      { memberId: member.id }
    );

    if (result.status === "SENT") {
      sent++;
      await prisma.member.update({
        where: { id: member.id },
        data: { lastWaSentAt: new Date() },
      });
    } else if (result.status === "SKIPPED") {
      skipped++;
      // Tetap update lastWaSentAt pada dry-run agar cooldown dapat diuji & disimulasikan
      await prisma.member.update({
        where: { id: member.id },
        data: { lastWaSentAt: new Date() },
      });
    } else {
      failed++;
    }

    // Jeda antar pesan agar tidak membanjiri API
    if (i < candidates.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    wibHour,
    inactiveDays,
    cooldownDays,
    processed: candidates.length,
    sent,
    skipped,
    failed,
  });
}

export async function GET(req: NextRequest) {
  return handleComebackCron(req);
}

export async function POST(req: NextRequest) {
  return handleComebackCron(req);
}

