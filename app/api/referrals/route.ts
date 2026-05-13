import { NextResponse } from "next/server";
import { referralInvitationEmail } from "@/components/emails/templates";
import { getAuthorizedMember } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import { getPrisma } from "@/lib/prisma/client";
import { referralSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const member = await getAuthorizedMember();

  if (!member) {
    return NextResponse.json({ error: "Member access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = referralSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the referral details." }, { status: 400 });
  }

  const data = parsed.data;
  const referral = await getPrisma().referral.create({
    data: {
      referrerId: member.id,
      referredName: data.referred_name,
      referredEmail: data.referred_email,
      relationship: data.relationship,
      note: data.optional_note || null,
    },
  });

  const email = referralInvitationEmail({
    referredName: data.referred_name,
    referrerName: member.fullName,
    requestUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/request-access?referred_by=${encodeURIComponent(member.fullName)}`,
    note: data.optional_note,
  });

  await sendTransactionalEmail({
    to: data.referred_email,
    templateKey: "referral_invitation",
    ...email,
  }).catch((error) => {
    console.error("referral_invitation email failed", error);
  });

  return NextResponse.json({ ok: true, referral });
}
