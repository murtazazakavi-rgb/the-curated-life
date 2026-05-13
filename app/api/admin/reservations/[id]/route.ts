import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  reservationCancelledEmail,
  reservationConfirmedEmail,
  reservationWaitlistedEmail,
} from "@/lib/email/templates";
import { ReservationStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { reservationDecisionSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reservationDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown reservation action." }, { status: 400 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { user: true, experience: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (parsed.data.status === ReservationStatus.CONFIRMED) {
    const confirmedCount = await prisma.reservation.count({
      where: {
        experienceId: reservation.experienceId,
        status: ReservationStatus.CONFIRMED,
        id: { not: reservation.id },
      },
    });

    if (
      reservation.experience.seatsTotal &&
      confirmedCount >= reservation.experience.seatsTotal
    ) {
      return NextResponse.json(
        { error: "This event is already at confirmed capacity." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  const template =
    parsed.data.status === ReservationStatus.CONFIRMED
      ? reservationConfirmedEmail
      : parsed.data.status === ReservationStatus.WAITLISTED
        ? reservationWaitlistedEmail
        : reservationCancelledEmail;

  const email = template({
    name: reservation.user.fullName,
    experienceTitle: reservation.experience.title,
  });

  await sendTransactionalEmail({
    to: reservation.user.email,
    templateKey: `reservation_${parsed.data.status.toLowerCase()}`,
    ...email,
  }).catch((error) => {
    console.error("reservation status email failed", error);
  });

  return NextResponse.json({ ok: true, reservation: updated });
}
