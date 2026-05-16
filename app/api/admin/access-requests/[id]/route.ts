import { NextResponse } from "next/server";
import {
  accessApprovedSetPasswordEmail,
  accessDeclinedEmail,
  accessWaitlistedEmail,
} from "@/lib/email/templates";
import { isAdminEmail } from "@/lib/admin/access";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { createPasswordSetupTokenWithClient } from "@/lib/auth/password";
import {
  sendTransactionalEmail,
  type EmailDeliveryResult,
} from "@/lib/email/send";
import { siteUrl } from "@/lib/email/templates/base";
import {
  AccessStatus,
  EventStatus,
  EventVisibility,
  UserRole,
} from "@/lib/generated/prisma/enums";
import {
  getTableColumns,
  hasEventLifecycleSchema,
  hasPasswordSetupSchema,
} from "@/lib/events/lifecycle";
import { getPrisma } from "@/lib/prisma/client";
import { accessDecisionSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

type ReviewedMember = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accessStatus: AccessStatus;
  passwordSetAt?: Date | null;
  suspendedAt?: Date | null;
  createdAt: Date;
};

type SetupEmailDelivery =
  | EmailDeliveryResult
  | {
      status: "failed";
      provider: "unknown";
      message: string;
    };

function serializeMember(member: ReviewedMember | null) {
  if (!member) return null;

  return {
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    role: member.role,
    accessStatus: member.accessStatus,
    passwordSetAt: member.passwordSetAt?.toISOString() ?? null,
    suspendedAt: member.suspendedAt?.toISOString() ?? null,
    createdAt: member.createdAt.toISOString(),
  };
}

function failedSetupEmailDelivery(): SetupEmailDelivery {
  return {
    status: "failed",
    provider: "unknown",
    message: "Setup email could not be sent. Check your email provider settings.",
  };
}

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

  try {
    const existingRequest = await prisma.accessRequest.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        referredBy: true,
        status: true,
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 },
      );
    }

    if (
      status === AccessStatus.APPROVED &&
      !(await hasPasswordSetupSchema(prisma))
    ) {
      return NextResponse.json(
        { error: "Approving members needs the password setup database migration." },
        { status: 503 },
      );
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

    const accessRequestColumns = await getTableColumns(prisma, "AccessRequest");
    const reviewData: {
      status?: AccessStatus;
      reviewedAt?: Date;
      reviewedById?: string;
      adminNote?: string;
    } = {};

    if (parsed.data.action !== "resend_setup") {
      reviewData.status = status;
      if (accessRequestColumns.has("reviewedAt")) reviewData.reviewedAt = new Date();
      if (accessRequestColumns.has("reviewedById")) reviewData.reviewedById = admin.id;
    }

    if (parsed.data.adminNote && accessRequestColumns.has("adminNote")) {
      reviewData.adminNote = parsed.data.adminNote;
    }

    let setupToken: string | null = null;
    let reviewedMember: ReviewedMember | null = null;
    let setupEmailDelivery: SetupEmailDelivery | null = null;

    const accessRequest = await prisma.$transaction(async (tx) => {
      const nextRequest =
        Object.keys(reviewData).length > 0
          ? await tx.accessRequest.update({
              where: { id },
              data: reviewData,
              select: {
                id: true,
                fullName: true,
                email: true,
                referredBy: true,
                status: true,
              },
            })
          : existingRequest;

      if (status === AccessStatus.APPROVED) {
        const user = await tx.user.upsert({
          where: { email: nextRequest.email },
          update: {
            fullName: nextRequest.fullName,
            accessStatus: AccessStatus.APPROVED,
            role:
              isAdminEmail(nextRequest.email) ||
              previousUser?.role === UserRole.ADMIN
                ? UserRole.ADMIN
                : UserRole.MEMBER,
            referredBy: nextRequest.referredBy,
          },
          create: {
            email: nextRequest.email,
            fullName: nextRequest.fullName,
            accessStatus: AccessStatus.APPROVED,
            role: isAdminEmail(nextRequest.email)
              ? UserRole.ADMIN
              : UserRole.MEMBER,
            referredBy: nextRequest.referredBy,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            accessStatus: true,
            passwordSetAt: true,
            suspendedAt: true,
            createdAt: true,
          },
        });

        setupToken = await createPasswordSetupTokenWithClient(tx, user.id);
        reviewedMember = user;
      }

      if (status === AccessStatus.DECLINED) {
        await tx.user.updateMany({
          where: { email: nextRequest.email },
          data: { accessStatus: AccessStatus.DECLINED },
        });
      }

      if (status === AccessStatus.WAITLISTED) {
        await tx.user.updateMany({
          where: { email: nextRequest.email },
          data: { accessStatus: AccessStatus.WAITLISTED },
        });
      }

      return nextRequest;
    });

    if (status !== AccessStatus.APPROVED && previousUser) {
      reviewedMember = await prisma.user.findUnique({
        where: { email: accessRequest.email },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          accessStatus: true,
          passwordSetAt: true,
          suspendedAt: true,
          createdAt: true,
        },
      });
    }

    if (status === AccessStatus.APPROVED && setupToken) {
      const lifecycleReady = await hasEventLifecycleSchema(prisma);
      const liveExperiences = lifecycleReady
        ? await prisma.experience.findMany({
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
          })
        : await prisma.experience.findMany({
            where: {
              isVisible: true,
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

      setupEmailDelivery = await sendTransactionalEmail({
        to: accessRequest.email,
        templateKey:
          parsed.data.action === "resend_setup"
            ? "access_approved_setup_resent"
            : "access_approved_set_password",
        ...email,
      }).catch((error) => {
        console.error("access_approved_set_password email failed", error);
        return failedSetupEmailDelivery();
      });
    }

    if (status === AccessStatus.DECLINED) {
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
      const email = accessWaitlistedEmail(accessRequest.fullName);
      await sendTransactionalEmail({
        to: accessRequest.email,
        templateKey: "access_waitlisted",
        ...email,
      }).catch((error) => {
        console.error("access_waitlisted email failed", error);
      });
    }

    return NextResponse.json({
      ok: true,
      status,
      member: serializeMember(reviewedMember),
      setupEmailDelivery,
    });
  } catch (error) {
    console.error("access request review failed", error);

    return NextResponse.json(
      { error: "Could not update access request. Please try again." },
      { status: 500 },
    );
  }
}
