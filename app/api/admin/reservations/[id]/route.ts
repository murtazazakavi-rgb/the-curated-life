import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  cancellationApprovedEmail,
  cancellationDeclinedEmail,
  reservationCancelledEmail,
  reservationConfirmedEmail,
  reservationWaitlistedEmail,
} from "@/lib/email/templates";
import { hasEventLifecycleSchema } from "@/lib/events/lifecycle";
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
  const lifecycleReady = await hasEventLifecycleSchema(prisma);
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      experienceId: true,
      status: true,
      previousStatus: lifecycleReady,
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
      experience: {
        select: {
          title: true,
          seatsTotal: true,
        },
      },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (parsed.data.action === "approve_cancellation") {
    if (!lifecycleReady) {
      return NextResponse.json(
        { error: "Cancellation review needs the latest database migration." },
        { status: 503 },
      );
    }

    if (reservation.status !== ReservationStatus.CANCELLATION_REQUESTED) {
      return NextResponse.json(
        { error: "This reservation is not awaiting cancellation review." },
        { status: 400 },
      );
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        adminCancellationReply: parsed.data.adminReply || null,
      },
      select: { id: true, status: true },
    });

    const email = cancellationApprovedEmail({
      name: reservation.user.fullName,
      experienceTitle: reservation.experience.title,
    });

    await sendTransactionalEmail({
      to: reservation.user.email,
      templateKey: "cancellation_approved",
      ...email,
    }).catch((error) => {
      console.error("cancellation approved email failed", error);
    });

    return NextResponse.json({ ok: true, reservation: updated });
  }

  if (parsed.data.action === "decline_cancellation") {
    if (!lifecycleReady) {
      return NextResponse.json(
        { error: "Cancellation review needs the latest database migration." },
        { status: 503 },
      );
    }

    if (reservation.status !== ReservationStatus.CANCELLATION_REQUESTED) {
      return NextResponse.json(
        { error: "This reservation is not awaiting cancellation review." },
        { status: 400 },
      );
    }

    const restoredStatus =
      reservation.previousStatus &&
      reservation.previousStatus !== ReservationStatus.CANCELLATION_REQUESTED
        ? reservation.previousStatus
        : ReservationStatus.CONFIRMED;

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: restoredStatus,
        adminCancellationReply: parsed.data.adminReply || null,
      },
      select: { id: true, status: true },
    });

    const email = cancellationDeclinedEmail({
      name: reservation.user.fullName,
      experienceTitle: reservation.experience.title,
      reply: parsed.data.adminReply,
    });

    await sendTransactionalEmail({
      to: reservation.user.email,
      templateKey: "cancellation_declined",
      ...email,
    }).catch((error) => {
      console.error("cancellation declined email failed", error);
    });

    return NextResponse.json({ ok: true, reservation: updated });
  }

  if (!parsed.data.status) {
    return NextResponse.json({ error: "Unknown reservation action." }, { status: 400 });
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
    select: { id: true, status: true },
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
