import { NextResponse } from "next/server";
import {
  accessApprovedSetPasswordEmail,
  accessDeclinedEmail,
  accessWaitlistedEmail,
} from "@/lib/email/templates";
import { isAdminEmail } from "@/lib/admin/access";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { createPasswordSetupToken } from "@/lib/auth/password";
import { sendTransactionalEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/email/templates/base";
import {
  AccessStatus,
  EventStatus,
  EventVisibility,
  UserRole,
} from "@/lib/generated/prisma/enums";
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
    resend_setup: AccessStatus.APPROVED,
  } as const;

  const status = statusByAction[parsed.data.action];
  const prisma = getPrisma();
  const existingRequest = await prisma.accessRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    return NextResponse.json({ error: "Access request not found." }, { status: 404 });
  }

  const previousUser = await prisma.user.findUnique({
    where: { email: existingRequest.email },
    select: { role: true },
  });

  if (
    parsed.data.action === "resend_setup" &&
    existingRequest.status !== AccessStatus.APPROVED &&
    !previousUser
  ) {
    return NextResponse.json(
      { error: "Setup email can only be resent after approval." },
      { status: 400 },
    );
  }

  const accessRequest = await prisma.accessRequest.update({
    where: { id },
    data: {
      status: parsed.data.action === "resend_setup" ? undefined : status,
      reviewedAt: parsed.data.action === "resend_setup" ? undefined : new Date(),
      reviewedById: parsed.data.action === "resend_setup" ? undefined : admin.id,
      adminNote: parsed.data.adminNote || undefined,
    },
  });

  if (status === AccessStatus.APPROVED) {
    const user = await prisma.user.upsert({
      where: { email: accessRequest.email },
      update: {
        fullName: accessRequest.fullName,
        accessStatus: AccessStatus.APPROVED,
        role:
          isAdminEmail(accessRequest.email) || previousUser?.role === UserRole.ADMIN
            ? UserRole.ADMIN
            : UserRole.MEMBER,
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

    const setupToken = await createPasswordSetupToken(user.id);
    const liveExperiences = await prisma.experience.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        visibilityType: EventVisibility.ALL_MEMBERS,
        isVisible: true,
        isArchived: false,
        dateTime: { gte: new Date() },
      },
      orderBy: { dateTime: "asc" },
      take: 3,
      select: {
        title: true,
        dateTime: true,
        location: true,
      },
    });
    const email = accessApprovedSetPasswordEmail({
      name: accessRequest.fullName,
      setupUrl: siteUrl(`/set-password?token=${encodeURIComponent(setupToken)}`),
      experiences: liveExperiences,
    });

    await sendTransactionalEmail({
      to: accessRequest.email,
      templateKey:
        parsed.data.action === "resend_setup"
          ? "access_approved_setup_resent"
          : "access_approved_set_password",
      ...email,
    }).catch((error) => {
      console.error("access_approved_set_password email failed", error);
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

    const email = accessWaitlistedEmail(accessRequest.fullName);
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
