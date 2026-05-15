import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { parseIndiaDateTimeLocal } from "@/lib/dates/india";
import { getPrisma } from "@/lib/prisma/client";
import { experienceAdminSchema } from "@/lib/validators/access";

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
  const parsed = experienceAdminSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the experience details." }, { status: 400 });
  }

  const data = parsed.data;
  const experience = await getPrisma().experience.update({
    where: { id },
    data: {
      ...data,
      dateTime: data.dateTime ? parseIndiaDateTimeLocal(data.dateTime) : undefined,
      hostTitle: data.hostTitle === "" ? null : data.hostTitle,
      hostBio: data.hostBio === "" ? null : data.hostBio,
      seatsTotal: data.seatsTotal === undefined ? undefined : data.seatsTotal,
    },
  });

  return NextResponse.json({ ok: true, experience });
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
  const prisma = getPrisma();
  const reservationCount = await prisma.reservation.count({
    where: { experienceId: id },
  });

  if (reservationCount > 0) {
    return NextResponse.json(
      { error: "This event has reservations. Archive it instead of deleting it." },
      { status: 409 },
    );
  }

  await prisma.experience.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
