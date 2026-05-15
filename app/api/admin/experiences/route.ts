import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { parseIndiaDateTimeLocal } from "@/lib/dates/india";
import { EventStatus } from "@/lib/generated/prisma/enums";
import { lifecycleFlags, replaceAudienceMembers } from "@/lib/events/lifecycle";
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
    ...data
  } = parsed.data;
  const eventStatus = status as EventStatus;
  const prisma = getPrisma();
  const experience = await prisma.experience.create({
    data: {
      ...data,
      status: eventStatus,
      ...lifecycleFlags(eventStatus),
      hostTitle: data.hostTitle || null,
      hostBio: data.hostBio || null,
      seatsTotal: data.seatsTotal ?? null,
      dateTime: parseIndiaDateTimeLocal(data.dateTime),
    },
    include: {
      reservations: { select: { id: true, status: true } },
      audienceMembers: { select: { userId: true } },
    },
  });

  await replaceAudienceMembers(prisma, experience.id, selectedMemberIds);

  return NextResponse.json({ ok: true, experience });
}
