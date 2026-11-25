import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

/**
 * Verifikasi webhook Meta WhatsApp Cloud API
 */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WA_WEBHOOK_VERIFY_TOKEN || "kopi-nuri-wa-verify-token";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
}

/**
 * Terima pesan masuk dari Meta Webhook:
 * Jika member membalas "STOP", langsung set waOptIn = false.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MetaWebhookPayload;
    const optOutPhones: string[] = [];

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          const text = msg.text?.body?.trim().toUpperCase();
          if (msg.from && text && (text === "STOP" || text.startsWith("STOP "))) {
            optOutPhones.push(normalizePhone(msg.from));
          }
        }
      }
    }

    if (optOutPhones.length > 0) {
      await prisma.member.updateMany({
        where: { phone: { in: optOutPhones } },
        data: { waOptIn: false },
      });
    }

    return NextResponse.json({
      received: true,
      optedOutCount: optOutPhones.length,
    });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

