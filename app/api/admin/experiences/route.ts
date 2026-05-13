import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
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

  const data = parsed.data;
  const experience = await getPrisma().experience.create({
    data: {
      ...data,
      hostTitle: data.hostTitle || null,
      hostBio: data.hostBio || null,
      seatsTotal: data.seatsTotal ?? null,
      dateTime: new Date(data.dateTime),
    },
  });

  return NextResponse.json({ ok: true, experience });
}
