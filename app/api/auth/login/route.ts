import { NextResponse } from "next/server";
import {
  createSessionForUser,
  destinationForUser,
} from "@/lib/auth/server";
import { verifyPassword } from "@/lib/auth/password";
import { isAdminEmail } from "@/lib/admin/access";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { loginSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const user = await getPrisma().user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email) || user.role === UserRole.ADMIN;

  if (user.suspendedAt || (!isAdmin && user.accessStatus !== AccessStatus.APPROVED)) {
    return NextResponse.json({ error: "Access has not yet been granted." }, { status: 403 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: "Please use the setup link sent to your email." },
      { status: 403 },
    );
  }

  const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!validPassword) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    redirectTo: destinationForUser(user),
  });

  await createSessionForUser(user.id, response);

  return response;
}
