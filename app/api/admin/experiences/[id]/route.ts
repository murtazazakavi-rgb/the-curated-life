import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { parseIndiaDateTimeLocal } from "@/lib/dates/india";
import { formatExperienceDate } from "@/lib/data/experiences";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  eventAnnouncementEmail,
  eventCancelledEmail,
  eventPostponedEmail,
} from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/templates/base";
import {
  EventStatus,
  EventVisibility,
} from "@/lib/generated/prisma/enums";
import {
  activeApprovedMembersWhere,
  affectedReservationWhere,
  lifecycleFlags,
  replaceAudienceMembers,
} from "@/lib/events/lifecycle";
import { getPrisma } from "@/lib/prisma/client";
import {
  experienceAdminSchema,
  experienceLifecycleSchema,
} from "@/lib/validators/access";

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
  const lifecycle = experienceLifecycleSchema.safeParse(body);
  const prisma = getPrisma();

  if (lifecycle.success) {
    const current = await prisma.experience.findUnique({
      where: { id },
      include: {
        reservations: {
          where: affectedReservationWhere(id),
          include: { user: true },
        },
        audienceMembers: {
          include: { user: true },
        },
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const action = lifecycle.data.action;
    const now = new Date();
    let status = current.status;
    const data: {
      status?: EventStatus;
      isVisible?: boolean;
      isArchived?: boolean;
      publishedAt?: Date;
      announcementSentAt?: Date;
      postponedAt?: Date;
      cancelledAt?: Date;
      cancellationReason?: string | null;
      postponementMessage?: string | null;
    } = {};

    if (action === "save_draft" || action === "unpublish") {
      status = EventStatus.DRAFT;
      Object.assign(data, {
        status,
        ...lifecycleFlags(status),
      });
    }

    if (action === "publish") {
      status = EventStatus.PUBLISHED;
      Object.assign(data, {
        status,
        ...lifecycleFlags(status),
        publishedAt: current.publishedAt ?? now,
        postponedAt: undefined,
        cancelledAt: undefined,
        cancellationReason: null,
        postponementMessage: null,
      });

      if (!current.announcementSentAt) {
        data.announcementSentAt = now;
      }
    }

    if (action === "postpone") {
      if (!lifecycle.data.postponementMessage) {
        return NextResponse.json(
          { error: "A postponement message is required." },
          { status: 400 },
        );
      }

      status = EventStatus.POSTPONED;
      Object.assign(data, {
        status,
        isVisible: false,
        isArchived: false,
        postponedAt: now,
        postponementMessage: lifecycle.data.postponementMessage,
      });
    }

    if (action === "cancel") {
      if (!lifecycle.data.cancellationReason) {
        return NextResponse.json(
          { error: "A cancellation reason is required." },
          { status: 400 },
        );
      }

      status = EventStatus.CANCELLED;
      Object.assign(data, {
        status,
        isVisible: false,
        isArchived: false,
        cancelledAt: now,
        cancellationReason: lifecycle.data.cancellationReason,
      });
    }

    if (action === "archive") {
      status = EventStatus.ARCHIVED;
      Object.assign(data, {
        status,
        ...lifecycleFlags(status),
      });
    }

    const experience = await prisma.experience.update({
      where: { id },
      data,
      include: {
        reservations: { select: { id: true, status: true } },
        audienceMembers: { select: { userId: true } },
      },
    });

    if (action === "publish" && !current.announcementSentAt) {
      const audienceWhere =
        current.visibilityType === EventVisibility.ALL_MEMBERS
          ? activeApprovedMembersWhere()
          : {
              id: {
                in: current.audienceMembers.map((member) => member.userId),
              },
              ...activeApprovedMembersWhere(),
            };

      const recipients = await prisma.user.findMany({
        where: audienceWhere,
        select: { email: true, fullName: true },
      });

      await Promise.all(
        recipients.map((member) => {
          const email = eventAnnouncementEmail({
            name: member.fullName,
            experienceTitle: current.title,
            when: formatExperienceDate(current.dateTime),
            location: current.location,
            memberUrl: siteUrl("/member#invitations"),
            isPrivate: current.visibilityType !== EventVisibility.ALL_MEMBERS,
          });

          return sendTransactionalEmail({
            to: member.email,
            templateKey: "event_announcement",
            ...email,
          }).catch((error) => {
            console.error("event announcement email failed", error);
          });
        }),
      );
    }

    if (action === "postpone") {
      await Promise.all(
        current.reservations.map((reservation) => {
          const email = eventPostponedEmail({
            name: reservation.user.fullName,
            experienceTitle: current.title,
            message: lifecycle.data.postponementMessage || "",
            memberUrl: siteUrl("/member#history"),
          });

          return sendTransactionalEmail({
            to: reservation.user.email,
            templateKey: "event_postponed",
            ...email,
          }).catch((error) => {
            console.error("event postponed email failed", error);
          });
        }),
      );
    }

    if (action === "cancel") {
      await Promise.all(
        current.reservations.map((reservation) => {
          const email = eventCancelledEmail({
            name: reservation.user.fullName,
            experienceTitle: current.title,
            reason: lifecycle.data.cancellationReason || "",
            memberUrl: siteUrl("/member#history"),
          });

          return sendTransactionalEmail({
            to: reservation.user.email,
            templateKey: "event_cancelled",
            ...email,
          }).catch((error) => {
            console.error("event cancelled email failed", error);
          });
        }),
      );
    }

    return NextResponse.json({ ok: true, experience });
  }

  const parsed = experienceAdminSchema.partial().safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the experience details." }, { status: 400 });
  }

  const { selectedMemberIds, status, ...data } = parsed.data;
  const statusFlags = status ? lifecycleFlags(status as EventStatus) : {};
  await prisma.experience.update({
    where: { id },
    data: {
      ...data,
      ...statusFlags,
      status: status as EventStatus | undefined,
      dateTime: data.dateTime ? parseIndiaDateTimeLocal(data.dateTime) : undefined,
      hostTitle: data.hostTitle === "" ? null : data.hostTitle,
      hostBio: data.hostBio === "" ? null : data.hostBio,
      seatsTotal: data.seatsTotal === undefined ? undefined : data.seatsTotal,
    },
  });

  await replaceAudienceMembers(prisma, id, selectedMemberIds);
  const experience = await prisma.experience.findUniqueOrThrow({
    where: { id },
    include: {
      reservations: { select: { id: true, status: true } },
      audienceMembers: { select: { userId: true } },
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
