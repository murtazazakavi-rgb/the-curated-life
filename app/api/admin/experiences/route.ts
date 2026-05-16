import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { parseIndiaDateTimeLocal } from "@/lib/dates/india";
import { Prisma } from "@/lib/generated/prisma/client";
import { EventStatus } from "@/lib/generated/prisma/enums";
import {
  hasEventLifecycleSchema,
  lifecycleFlags,
  replaceAudienceMembers,
} from "@/lib/events/lifecycle";
import { getPrisma } from "@/lib/prisma/client";
import { experienceAdminSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

type RawEventValue = string | number | boolean | Date | null;
type RawExperienceRow = Record<string, RawEventValue>;

function isSchemaMismatchError(error: unknown) {
  return (
    error instanceof Error &&
    /column|relation|table|does not exist|Unknown arg|Invalid `prisma/i.test(error.message)
  );
}

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

async function getExperienceColumns(prisma: ReturnType<typeof getPrisma>) {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Experience'
  `;

  return new Set(columns.map((column) => column.column_name));
}

async function createExperienceWithPresentColumns(
  prisma: ReturnType<typeof getPrisma>,
  input: Omit<
    typeof experienceAdminSchema._output,
    "selectedMemberIds" | "status" | "visibilityType" | "attendeeVisibilityEnabled"
  >,
  eventStatus: EventStatus,
  visibilityType: string | undefined,
  attendeeVisibilityEnabled: boolean | undefined,
) {
  const columns = await getExperienceColumns(prisma);
  const now = new Date();
  const statusFlags = lifecycleFlags(eventStatus);
  const row: Record<string, RawEventValue> = {
    id: `evt_${randomUUID()}`,
    title: input.title,
    slug: input.slug,
    description: input.description,
    location: input.location,
    dateTime: parseIndiaDateTimeLocal(input.dateTime),
    imageUrl: input.imageUrl,
    hostedByLabel: input.hostedByLabel,
    hostName: input.hostName,
    hostTitle: input.hostTitle || null,
    hostBio: input.hostBio || null,
    seatsTotal: input.seatsTotal ?? null,
    isVisible: statusFlags.isVisible,
    isInviteOnly: input.isInviteOnly,
    createdAt: now,
  };

  if (columns.has("updatedAt")) row.updatedAt = now;
  if (columns.has("isArchived")) row.isArchived = statusFlags.isArchived;
  if (columns.has("status")) row.status = eventStatus;
  if (columns.has("publishedAt") && eventStatus === EventStatus.PUBLISHED) {
    row.publishedAt = now;
  }
  if (columns.has("visibilityType")) {
    row.visibilityType = visibilityType ?? "ALL_MEMBERS";
  }
  if (columns.has("attendeeVisibilityEnabled")) {
    row.attendeeVisibilityEnabled = attendeeVisibilityEnabled ?? true;
  }

  const presentEntries = Object.entries(row).filter(([column]) =>
    columns.has(column),
  );

  if (presentEntries.length === 0) {
    throw new Error("The Experience table is missing expected event columns.");
  }

  const created = await prisma.$queryRaw<RawExperienceRow[]>(Prisma.sql`
    INSERT INTO "Experience" (${Prisma.join(
      presentEntries.map(([column]) => Prisma.raw(`"${column}"`)),
    )})
    VALUES (${Prisma.join(presentEntries.map(([, value]) => value))})
    RETURNING *
  `);

  const [experience] = created;

  if (!experience) {
    throw new Error("Could not create event. Please try again.");
  }

  return {
    ...experience,
    reservations: [],
    isArchived: Boolean(experience.isArchived),
    status: typeof experience.status === "string" ? experience.status : eventStatus,
    visibilityType:
      typeof experience.visibilityType === "string"
        ? experience.visibilityType
        : "ALL_MEMBERS",
    attendeeVisibilityEnabled:
      typeof experience.attendeeVisibilityEnabled === "boolean"
        ? experience.attendeeVisibilityEnabled
        : true,
  };
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
  let createdWithLifecycle = lifecycleReady;

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

    if (!isSchemaMismatchError(error)) {
      return NextResponse.json(
        { error: eventMutationError(error) },
        { status: 500 },
      );
    }

    try {
      experience = await createExperienceWithPresentColumns(
        prisma,
        data,
        eventStatus,
        visibilityType,
        attendeeVisibilityEnabled,
      );
      createdWithLifecycle = false;
    } catch (fallbackError) {
      console.error("legacy event create fallback failed", fallbackError);
      return NextResponse.json(
        { error: eventMutationError(fallbackError) },
        { status: 500 },
      );
    }
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
      status: createdWithLifecycle ? experienceView.status : eventStatus,
      visibilityType: createdWithLifecycle ? experienceView.visibilityType : "ALL_MEMBERS",
      attendeeVisibilityEnabled: createdWithLifecycle
        ? experienceView.attendeeVisibilityEnabled
        : true,
      selectedMemberIds: createdWithLifecycle
        ? (experienceView.audienceMembers ?? []).map((member) => member.userId)
        : [],
    },
  });
}
