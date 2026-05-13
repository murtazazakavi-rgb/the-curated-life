import { NextResponse } from "next/server";
import { reservationReceivedEmail } from "@/components/emails/templates";
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

  const reservation = await prisma.reservation.create({
    data: {
      userId: member.id,
      experienceId: experience.id,
      status: ReservationStatus.REQUESTED,
    },
  });

  const email = reservationReceivedEmail({
    name: member.fullName,
    experienceTitle: experience.title,
  });

  await sendTransactionalEmail({
    to: member.email,
    templateKey: "reservation_received",
    ...email,
  }).catch((error) => {
    console.error("reservation_received email failed", error);
  });

  return NextResponse.json({ ok: true, reservation });
}
