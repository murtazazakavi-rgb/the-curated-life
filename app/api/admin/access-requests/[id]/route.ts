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
import { hasEventLifecycleSchema } from "@/lib/events/lifecycle";
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
    }
  | {
      status: "not_needed";
      provider: "none";
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

function failedSetupEmailDelivery(message?: string): SetupEmailDelivery {
  return {
    status: "failed",
    provider: "unknown",
    message:
      message ?? "Setup email could not be sent. Check your email provider settings.",
  };
}

function setupEmailNotNeeded(): SetupEmailDelivery {
  return {
    status: "not_needed",
    provider: "none",
    message: "Access approved. This member already has a password, so no setup email was sent.",
  };
}

function routeError(message: string, error: unknown) {
  const detail = error instanceof Error ? error.message : "";

  return NextResponse.json(
    {
      error: detail ? `${message}: ${detail}` : message,
    },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
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

    const previousUser = await prisma.user.findUnique({
      where: { email: existingRequest.email },
      select: { role: true, passwordSetAt: true },
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

    const reviewData: {
      status?: AccessStatus;
      reviewedAt?: Date;
      reviewedById?: string;
      adminNote?: string;
    } = {};

    if (parsed.data.action !== "resend_setup") {
      reviewData.status = status;
      reviewData.reviewedAt = new Date();
      reviewData.reviewedById = admin.id;
    }

    if (parsed.data.adminNote) {
      reviewData.adminNote = parsed.data.adminNote;
    }

    let setupToken: string | null = null;
    let reviewedMember: ReviewedMember | null = null;
    let setupEmailDelivery: SetupEmailDelivery | null = null;

    const accessRequest =
      Object.keys(reviewData).length > 0
        ? await prisma.accessRequest
            .update({
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
            .catch(async (error) => {
              console.error("access request review metadata update failed", error);

              return prisma.accessRequest.update({
                where: { id },
                data: { status },
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  referredBy: true,
                  status: true,
                },
              });
            })
        : existingRequest;

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

      reviewedMember = user;

      if (user.passwordSetAt) {
        setupEmailDelivery = setupEmailNotNeeded();
      } else {
        setupToken = await createPasswordSetupTokenWithClient(prisma, user.id).catch(
          (error) => {
            console.error("password setup token create failed", error);
            setupEmailDelivery = failedSetupEmailDelivery(
              "Setup token could not be created. The member was approved, but no setup email was sent.",
            );
            return null;
          },
        );
      }
    }

    if (status === AccessStatus.DECLINED) {
      await prisma.user.updateMany({
        where: { email: accessRequest.email },
        data: { accessStatus: AccessStatus.DECLINED },
      });
    }

    if (status === AccessStatus.WAITLISTED) {
      await prisma.user.updateMany({
        where: { email: accessRequest.email },
        data: { accessStatus: AccessStatus.WAITLISTED },
      });
    }

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

    return routeError("Could not update access request", error);
  }
}
