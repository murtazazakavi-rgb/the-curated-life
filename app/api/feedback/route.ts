import { NextResponse } from "next/server";
import { getAdminEmails } from "@/lib/admin/access";
import { getAuthorizedMember } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import { adminFeedbackReceivedEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/templates/base";
import { hasFeedbackSchema } from "@/lib/events/lifecycle";
import { getPrisma } from "@/lib/prisma/client";
import { feedbackCreateSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const member = await getAuthorizedMember();

  if (!member) {
    return NextResponse.json({ error: "Member access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please complete your note before sending it." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const feedbackReady = await hasFeedbackSchema(prisma);

  if (!feedbackReady) {
    return NextResponse.json(
      {
        error:
          "Member notes will be available once the latest update finishes.",
      },
      { status: 503 },
    );
  }

  const thread = await prisma.feedbackThread.create({
    data: {
      userId: member.id,
      category: parsed.data.category,
      subject: parsed.data.subject,
      messages: {
        create: {
          senderId: member.id,
          message: parsed.data.message,
        },
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  await Promise.all(
    getAdminEmails().map((to) => {
      const email = adminFeedbackReceivedEmail({
        memberName: member.fullName,
        memberEmail: member.email,
        category: parsed.data.category.replace(/_/g, " "),
        subject: parsed.data.subject,
        message: parsed.data.message,
        adminUrl: siteUrl("/admin"),
      });

      return sendTransactionalEmail({
        to,
        templateKey: "admin_feedback_received",
        ...email,
      }).catch((error) => {
        console.error("admin feedback email failed", error);
      });
    }),
  );

  return NextResponse.json({
    ok: true,
    thread: {
      id: thread.id,
      category: thread.category,
      subject: thread.subject,
      status: thread.status,
      createdAt: thread.createdAt.toISOString(),
      messages: thread.messages.map((message) => ({
        id: message.id,
        isAdmin: message.isAdmin,
        message: message.message,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}
