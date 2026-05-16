import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { createPasswordSetupTokenWithClient } from "@/lib/auth/password";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { directMemberSetPasswordEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/templates/base";
import {
  sendTransactionalEmail,
  type EmailDeliveryResult,
} from "@/lib/email/send";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { directMemberCreateSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

type MemberRecord = {
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

function serializeMember(member: MemberRecord) {
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

function routeError(message: string, error: unknown) {
  const detail = error instanceof Error ? error.message : "";

  return NextResponse.json(
    {
      error: detail ? `${message}: ${detail}` : message,
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const admin = await getAuthorizedAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = directMemberCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please review the member details." },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        passwordSetAt: true,
      },
    });

    if (existingUser?.passwordSetAt) {
      return NextResponse.json(
        {
          error:
            "A member with this email already has a password. Use Edit Member or ask them to reset their password.",
        },
        { status: 409 },
      );
    }

    const accessRequestData: {
      status: AccessStatus;
      reviewedAt: Date;
      reviewedById: string;
      adminNote: string;
    } = {
      status: AccessStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
      adminNote: "Added directly by admin.",
    };

    const member = await prisma.user.upsert({
      where: { email: parsed.data.email },
      update: {
        fullName: parsed.data.fullName,
        accessStatus: AccessStatus.APPROVED,
        role:
          isAdminEmail(parsed.data.email) || parsed.data.role === UserRole.ADMIN
            ? UserRole.ADMIN
            : UserRole.MEMBER,
        suspendedAt: null,
      },
      create: {
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        accessStatus: AccessStatus.APPROVED,
        role:
          isAdminEmail(parsed.data.email) || parsed.data.role === UserRole.ADMIN
            ? UserRole.ADMIN
            : UserRole.MEMBER,
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

    await prisma.accessRequest
      .updateMany({
        where: { email: parsed.data.email },
        data: accessRequestData,
      })
      .catch(async (error) => {
        console.error("direct member access request sync failed", error);

        await prisma.accessRequest.updateMany({
          where: { email: parsed.data.email },
          data: { status: AccessStatus.APPROVED },
        });
      });

    let setupEmailDelivery: SetupEmailDelivery | null = null;
    const setupToken = await createPasswordSetupTokenWithClient(
      prisma,
      member.id,
    ).catch((error) => {
      console.error("password setup token create failed", error);
      setupEmailDelivery = failedSetupEmailDelivery(
        "Member was added, but the setup token could not be created.",
      );
      return null;
    });

    if (setupToken) {
      const email = directMemberSetPasswordEmail({
        name: member.fullName,
        setupUrl: siteUrl(`/set-password?token=${encodeURIComponent(setupToken)}`),
      });

      setupEmailDelivery = await sendTransactionalEmail({
        to: member.email,
        templateKey: "direct_member_set_password",
        ...email,
      }).catch((error) => {
        console.error("direct_member_set_password email failed", error);
        return failedSetupEmailDelivery();
      });
    }

    return NextResponse.json({
      ok: true,
      member: serializeMember(member),
      setupEmailDelivery,
    });
  } catch (error) {
    console.error("direct member create failed", error);

    return routeError("Could not add member", error);
  }
}
