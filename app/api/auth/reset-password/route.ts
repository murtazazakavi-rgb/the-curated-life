import { NextResponse } from "next/server";
import {
  createSessionForUser,
  destinationForUser,
} from "@/lib/auth/server";
import {
  getValidPasswordResetToken,
  hashOpaqueToken,
  hashPassword,
} from "@/lib/auth/password";
import { getPrisma } from "@/lib/prisma/client";
import { passwordTokenSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = passwordTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please choose a password with at least 8 characters." },
      { status: 400 },
    );
  }

  const token = await getValidPasswordResetToken(parsed.data.token);

  if (!token) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
        passwordSetAt: new Date(),
        emailVerified: true,
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        tokenHash: hashOpaqueToken(parsed.data.token),
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await tx.session.deleteMany({
      where: { userId: token.userId },
    });
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: token.userId } });
  const response = NextResponse.json({
    ok: true,
    redirectTo: destinationForUser(user),
  });

  await createSessionForUser(user.id, response);

  return response;
}
