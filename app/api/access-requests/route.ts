import { NextResponse } from "next/server";
import { requestReceivedEmail } from "@/components/emails/templates";
import { sendTransactionalEmail } from "@/lib/email/send";
import { getPrisma } from "@/lib/prisma/client";
import { requestAccessSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review the request details and try again." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  await getPrisma().accessRequest.create({
    data: {
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      referredBy: data.referred_by || null,
      interests: data.interests,
      preferredExperiences: data.preferred_experiences,
      message: data.message,
    },
  });

  const email = requestReceivedEmail(data.full_name);

  await sendTransactionalEmail({
    to: data.email,
    templateKey: "request_received",
    ...email,
  }).catch((error) => {
    console.error("request_received email failed", error);
  });

  return NextResponse.json({ ok: true });
}
