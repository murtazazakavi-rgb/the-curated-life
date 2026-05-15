import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { memberAdminSchema } from "@/lib/validators/access";

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
  const parsed = memberAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the member details." }, { status: 400 });
  }

  if (
    id === admin.id &&
    (parsed.data.role !== UserRole.ADMIN ||
      parsed.data.accessStatus !== AccessStatus.APPROVED)
  ) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 },
    );
  }

  const member = await getPrisma().user.update({
    where: { id },
    data: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: parsed.data.role,
      accessStatus: parsed.data.accessStatus,
      suspendedAt:
        parsed.data.accessStatus === AccessStatus.APPROVED ? null : undefined,
    },
  });

  return NextResponse.json({ ok: true, member });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 },
    );
  }

  await getPrisma().user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
