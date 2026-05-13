import { NextResponse } from "next/server";
import {
  accessApprovedEmail,
  accessDeclinedEmail,
  waitlistedEmail,
} from "@/components/emails/templates";
import { isAdminEmail } from "@/lib/admin/access";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { accessDecisionSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = accessDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown review action." }, { status: 400 });
  }

  const statusByAction = {
    approve: AccessStatus.APPROVED,
    decline: AccessStatus.DECLINED,
    waitlist: AccessStatus.WAITLISTED,
  } as const;

  const status = statusByAction[parsed.data.action];
  const prisma = getPrisma();

  const accessRequest = await prisma.accessRequest.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
    },
  });

  if (status === AccessStatus.APPROVED) {
    await prisma.user.upsert({
      where: { email: accessRequest.email },
      update: {
        fullName: accessRequest.fullName,
        accessStatus: AccessStatus.APPROVED,
        role: isAdminEmail(accessRequest.email) ? UserRole.ADMIN : UserRole.MEMBER,
        referredBy: accessRequest.referredBy,
      },
      create: {
        email: accessRequest.email,
        fullName: accessRequest.fullName,
        accessStatus: AccessStatus.APPROVED,
        role: isAdminEmail(accessRequest.email) ? UserRole.ADMIN : UserRole.MEMBER,
        referredBy: accessRequest.referredBy,
      },
    });

    const email = accessApprovedEmail(
      accessRequest.fullName,
      `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/login`,
    );

    await sendTransactionalEmail({
      to: accessRequest.email,
      templateKey: "access_approved",
      ...email,
    }).catch((error) => {
      console.error("access_approved email failed", error);
    });
  }

  if (status === AccessStatus.DECLINED) {
    await prisma.user.updateMany({
      where: { email: accessRequest.email },
      data: { accessStatus: AccessStatus.DECLINED },
    });

    const email = accessDeclinedEmail(accessRequest.fullName);
    await sendTransactionalEmail({
      to: accessRequest.email,
      templateKey: "access_declined",
      ...email,
    }).catch((error) => {
      console.error("access_declined email failed", error);
    });
  }

  if (status === AccessStatus.WAITLISTED) {
    await prisma.user.updateMany({
      where: { email: accessRequest.email },
      data: { accessStatus: AccessStatus.WAITLISTED },
    });

    const email = waitlistedEmail(accessRequest.fullName);
    await sendTransactionalEmail({
      to: accessRequest.email,
      templateKey: "access_waitlisted",
      ...email,
    }).catch((error) => {
      console.error("access_waitlisted email failed", error);
    });
  }

  return NextResponse.json({ ok: true, status });
}
