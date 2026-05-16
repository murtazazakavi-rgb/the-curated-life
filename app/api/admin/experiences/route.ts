import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { parseIndiaDateTimeLocal } from "@/lib/dates/india";
import { EventStatus } from "@/lib/generated/prisma/enums";
import {
  hasEventLifecycleSchema,
  lifecycleFlags,
  replaceAudienceMembers,
} from "@/lib/events/lifecycle";
import { getPrisma } from "@/lib/prisma/client";
import { experienceAdminSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = experienceAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the experience details." }, { status: 400 });
  }

  const {
    selectedMemberIds,
    status = EventStatus.DRAFT,
    visibilityType,
    attendeeVisibilityEnabled,
    ...data
  } = parsed.data;
  const eventStatus = status as EventStatus;
  const prisma = getPrisma();
  const lifecycleReady = await hasEventLifecycleSchema(prisma);
  const statusFlags = lifecycleFlags(eventStatus);
  const experience = await prisma.experience.create({
    data: {
      ...data,
      ...statusFlags,
      ...(lifecycleReady
        ? {
            status: eventStatus,
            visibilityType,
            attendeeVisibilityEnabled,
          }
        : {}),
      hostTitle: data.hostTitle || null,
      hostBio: data.hostBio || null,
      seatsTotal: data.seatsTotal ?? null,
      dateTime: parseIndiaDateTimeLocal(data.dateTime),
    },
    include: lifecycleReady
      ? {
          reservations: { select: { id: true, status: true } },
          audienceMembers: { select: { userId: true } },
        }
      : {
          reservations: { select: { id: true, status: true } },
        },
  });

  if (lifecycleReady) {
    await replaceAudienceMembers(prisma, experience.id, selectedMemberIds);
  }

  const experienceView = experience as typeof experience & {
    audienceMembers?: Array<{ userId: string }>;
    status?: EventStatus;
    visibilityType?: string;
    attendeeVisibilityEnabled?: boolean;
  };

  return NextResponse.json({
    ok: true,
    experience: {
      ...experienceView,
      status: lifecycleReady ? experienceView.status : eventStatus,
      visibilityType: lifecycleReady ? experienceView.visibilityType : "ALL_MEMBERS",
      attendeeVisibilityEnabled: lifecycleReady
        ? experienceView.attendeeVisibilityEnabled
        : true,
      selectedMemberIds: lifecycleReady
        ? (experienceView.audienceMembers ?? []).map((member) => member.userId)
        : [],
    },
  });
}
