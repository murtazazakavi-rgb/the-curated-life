import { NextResponse } from "next/server";
import {
  adminCancellationRequestedEmail,
  reservationRequestedEmail,
  reservationWaitlistedEmail,
} from "@/lib/email/templates";
import { getAuthorizedMember } from "@/lib/auth/server";
import { getAdminEmails } from "@/lib/admin/access";
import { sendTransactionalEmail } from "@/lib/email/send";
import { EventStatus, ReservationStatus } from "@/lib/generated/prisma/enums";
import { siteUrl } from "@/lib/email/templates/base";
import { getPrisma } from "@/lib/prisma/client";
import {
  cancellationRequestSchema,
  reservationSchema,
} from "@/lib/validators/access";

export const runtime = "nodejs";

async function hasLifecycleSchema() {
  try {
    const [result] = await getPrisma().$queryRaw<Array<{ ready: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Experience'
          AND column_name = 'status'
      ) AS ready
    `;

    return Boolean(result?.ready);
  } catch (error) {
    console.error("reservation schema readiness check failed", error);
    return false;
  }
}

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
  const lifecycleReady = await hasLifecycleSchema();
  const experience = await prisma.experience.findFirst({
    where: lifecycleReady
      ? {
          id: parsed.data.experience_id,
          status: EventStatus.PUBLISHED,
          isVisible: true,
          isArchived: false,
          dateTime: { gte: new Date() },
          OR: [
            { visibilityType: "ALL_MEMBERS" },
            { audienceMembers: { some: { userId: member.id } } },
          ],
        }
      : {
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

  if (existing && existing.status !== ReservationStatus.CANCELLED) {
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

  const reservation = existing
    ? await prisma.reservation.update({
        where: { id: existing.id },
        data: lifecycleReady
          ? {
              status,
              cancellationRequestedAt: null,
              cancellationReason: null,
              cancellationNote: null,
              previousStatus: null,
              adminCancellationReply: null,
            }
          : { status },
      })
    : await prisma.reservation.create({
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
  const parsed = cancellationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please share a cancellation reason." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const lifecycleReady = await hasLifecycleSchema();

  if (!lifecycleReady) {
    return NextResponse.json(
      {
        error:
          "Cancellation requests will be available once the member update finishes.",
      },
      { status: 503 },
    );
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      id: parsed.data.reservation_id,
      userId: member.id,
    },
    include: { experience: true },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (
    reservation.status === ReservationStatus.CANCELLED ||
    reservation.status === ReservationStatus.CANCELLATION_REQUESTED
  ) {
    return NextResponse.json({ ok: true, reservation });
  }

  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: ReservationStatus.CANCELLATION_REQUESTED,
      previousStatus: reservation.status,
      cancellationRequestedAt: new Date(),
      cancellationReason: parsed.data.reason,
      cancellationNote: parsed.data.note || null,
    },
  });

  await Promise.all(
    getAdminEmails().map((to) => {
      const email = adminCancellationRequestedEmail({
        memberName: member.fullName,
        memberEmail: member.email,
        experienceTitle: reservation.experience.title,
        reason: parsed.data.reason,
        note: parsed.data.note,
        adminUrl: siteUrl("/admin"),
      });

      return sendTransactionalEmail({
        to,
        templateKey: "admin_cancellation_requested",
        ...email,
      }).catch((error) => {
        console.error("admin_cancellation_requested email failed", error);
      });
    }),
  );

  return NextResponse.json({ ok: true, reservation: updated });
}
