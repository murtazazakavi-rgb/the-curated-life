import {
  AccessStatus,
  EventStatus,
  EventVisibility,
  ReservationStatus,
} from "@/lib/generated/prisma/enums";
import type { PrismaClient } from "@/lib/generated/prisma/client";

export function lifecycleFlags(status: EventStatus) {
  return {
    isVisible: status === EventStatus.PUBLISHED,
    isArchived: status === EventStatus.ARCHIVED,
  };
}

export async function hasEventLifecycleSchema(prisma: PrismaClient) {
  try {
    const [result] = await prisma.$queryRaw<Array<{ ready: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Experience'
          AND column_name = 'status'
      ) AS ready
    `;

    return Boolean(result?.ready);
  } catch (error) {
    console.error("event lifecycle schema check failed", error);
    return false;
  }
}

export async function hasFeedbackSchema(prisma: PrismaClient) {
  try {
    const [result] = await prisma.$queryRaw<Array<{ ready: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'FeedbackThread'
      ) AS ready
    `;

    return Boolean(result?.ready);
  } catch (error) {
    console.error("feedback schema check failed", error);
    return false;
  }
}

export function statusFromLegacyFlags(input: {
  status?: EventStatus | null;
  isVisible: boolean;
  isArchived: boolean;
}) {
  if (input.status) return input.status;
  if (input.isArchived) return EventStatus.ARCHIVED;
  return input.isVisible ? EventStatus.PUBLISHED : EventStatus.DRAFT;
}

export function publicEventWhere() {
  return {
    status: EventStatus.PUBLISHED,
    isVisible: true,
    isArchived: false,
    dateTime: { gte: new Date() },
  };
}

export function memberEligibleEventWhere(memberId: string) {
  return {
    ...publicEventWhere(),
    OR: [
      { visibilityType: EventVisibility.ALL_MEMBERS },
      { audienceMembers: { some: { userId: memberId } } },
    ],
  };
}

export function activeApprovedMembersWhere() {
  return {
    accessStatus: AccessStatus.APPROVED,
    suspendedAt: null,
  };
}

export function affectedReservationWhere(experienceId: string) {
  return {
    experienceId,
    status: {
      in: [
        ReservationStatus.REQUESTED,
        ReservationStatus.CONFIRMED,
        ReservationStatus.WAITLISTED,
        ReservationStatus.CANCELLATION_REQUESTED,
      ],
    },
  };
}

export async function replaceAudienceMembers(
  prisma: PrismaClient,
  experienceId: string,
  selectedMemberIds?: string[],
) {
  if (!selectedMemberIds) return;

  const uniqueIds = Array.from(new Set(selectedMemberIds));

  await prisma.experienceAudienceMember.deleteMany({
    where: { experienceId },
  });

  if (uniqueIds.length === 0) return;

  const approvedMembers = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
      ...activeApprovedMembersWhere(),
    },
    select: { id: true },
  });

  await prisma.experienceAudienceMember.createMany({
    data: approvedMembers.map((member) => ({
      experienceId,
      userId: member.id,
    })),
    skipDuplicates: true,
  });
}
