import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth/password";
import { isAdminEmail } from "@/lib/admin/access";
import { sendTransactionalEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/templates/base";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { forgotPasswordSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (parsed.success) {
    const user = await getPrisma().user.findUnique({
      where: { email: parsed.data.email },
    });

    const canReset =
      user &&
      !user.suspendedAt &&
      (user.accessStatus === AccessStatus.APPROVED ||
        user.role === UserRole.ADMIN ||
        isAdminEmail(user.email));

    if (canReset) {
      const token = await createPasswordResetToken(user.id);
      const email = passwordResetEmail({
        name: user.fullName,
        resetUrl: siteUrl(`/reset-password?token=${encodeURIComponent(token)}`),
      });

      await sendTransactionalEmail({
        to: user.email,
        templateKey: "password_reset",
        ...email,
      }).catch((error) => {
        console.error("password_reset email failed", error);
      });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has access, a password reset link has been sent.",
  });
}
