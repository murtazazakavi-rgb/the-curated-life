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

function eventMutationError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not create event. Please check the event details.";
  }

  if (/unique|slug/i.test(error.message)) {
    return "An event with this slug already exists. Change the slug and try again.";
  }

  if (/column|relation|table|does not exist|Unknown arg|Invalid `prisma/i.test(error.message)) {
    return "The event form needs the latest database migration. I saved a compatibility patch, but production still needs `npm run prisma:migrate` for all event fields.";
  }

  return error.message || "Could not create event. Please check the event details.";
}

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
  let experience;

  try {
    experience = await prisma.experience.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        location: data.location,
        dateTime: parseIndiaDateTimeLocal(data.dateTime),
        imageUrl: data.imageUrl,
        hostedByLabel: data.hostedByLabel,
        hostName: data.hostName,
        hostTitle: data.hostTitle || null,
        hostBio: data.hostBio || null,
        seatsTotal: data.seatsTotal ?? null,
        isInviteOnly: data.isInviteOnly,
        ...statusFlags,
        ...(lifecycleReady
          ? {
              status: eventStatus,
              visibilityType,
              attendeeVisibilityEnabled,
            }
          : {}),
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
  } catch (error) {
    console.error("event create failed", error);
    return NextResponse.json(
      { error: eventMutationError(error) },
      { status: 500 },
    );
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
