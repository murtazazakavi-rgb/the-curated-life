import { NextResponse } from "next/server";
import {
  reservationCancelledEmail,
  reservationRequestedEmail,
  reservationWaitlistedEmail,
} from "@/lib/email/templates";
import { getAuthorizedMember } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import { ReservationStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { reservationSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const member = await getAuthorizedMember();

  if (!member) {
    return NextResponse.json({ error: "Member access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = reservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please select an experience." }, { status: 400 });
  }

  const prisma = getPrisma();
  const experience = await prisma.experience.findFirst({
    where: {
      id: parsed.data.experience_id,
      isVisible: true,
      isArchived: false,
      dateTime: { gte: new Date() },
    },
  });

  if (!experience) {
    return NextResponse.json({ error: "Experience is not available." }, { status: 404 });
  }

  const existing = await prisma.reservation.findUnique({
    where: {
      userId_experienceId: {
        userId: member.id,
        experienceId: experience.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ ok: true, reservation: existing });
  }

  const confirmedCount = await prisma.reservation.count({
    where: {
      experienceId: experience.id,
      status: ReservationStatus.CONFIRMED,
    },
  });
  const status =
    experience.seatsTotal && confirmedCount >= experience.seatsTotal
      ? ReservationStatus.WAITLISTED
      : ReservationStatus.REQUESTED;

  const reservation = await prisma.reservation.create({
    data: {
      userId: member.id,
      experienceId: experience.id,
      status,
    },
  });

  const emailTemplate =
    status === ReservationStatus.WAITLISTED
      ? reservationWaitlistedEmail
      : reservationRequestedEmail;
  const email = emailTemplate({
    name: member.fullName,
    experienceTitle: experience.title,
  });

  await sendTransactionalEmail({
    to: member.email,
    templateKey:
      status === ReservationStatus.WAITLISTED
        ? "reservation_waitlisted"
        : "reservation_requested",
    ...email,
  }).catch((error) => {
    console.error("reservation request email failed", error);
  });

  return NextResponse.json({ ok: true, reservation });
}

export async function DELETE(request: Request) {
  const member = await getAuthorizedMember();

  if (!member) {
    return NextResponse.json({ error: "Member access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const reservationId =
    typeof body?.reservation_id === "string" ? body.reservation_id : "";

  if (!reservationId) {
    return NextResponse.json({ error: "Reservation is required." }, { status: 400 });
  }

  const prisma = getPrisma();
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      userId: member.id,
    },
    include: { experience: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: ReservationStatus.CANCELLED },
  });

  const email = reservationCancelledEmail({
    name: member.fullName,
    experienceTitle: reservation.experience.title,
  });

  await sendTransactionalEmail({
    to: member.email,
    templateKey: "reservation_cancelled",
    ...email,
  }).catch((error) => {
    console.error("reservation_cancelled email failed", error);
  });

  return NextResponse.json({ ok: true, reservation: updated });
}
