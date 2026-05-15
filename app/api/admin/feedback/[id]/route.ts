import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { sendTransactionalEmail } from "@/lib/email/send";
import { feedbackReplyEmail } from "@/lib/email/templates";
import { siteUrl } from "@/lib/email/templates/base";
import { FeedbackStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";
import { feedbackAdminSchema } from "@/lib/validators/access";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please review the feedback update." }, { status: 400 });
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const thread = await prisma.feedbackThread.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!thread) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  const hasReply = Boolean(parsed.data.reply?.trim());

  if (hasReply) {
    await prisma.feedbackMessage.create({
      data: {
        threadId: thread.id,
        senderId: admin.id,
        isAdmin: true,
        message: parsed.data.reply || "",
      },
    });
  }

  const updated = await prisma.feedbackThread.update({
    where: { id },
    data: {
      status:
        parsed.data.status ??
        (hasReply ? FeedbackStatus.REPLIED : thread.status),
    },
    include: {
      user: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (hasReply) {
    const email = feedbackReplyEmail({
      name: updated.user.fullName,
      subject: updated.subject,
      reply: parsed.data.reply || "",
      memberUrl: siteUrl("/member#feedback"),
    });

    await sendTransactionalEmail({
      to: updated.user.email,
      templateKey: "feedback_reply",
      ...email,
    }).catch((error) => {
      console.error("feedback reply email failed", error);
    });
  }

  return NextResponse.json({
    ok: true,
    thread: {
      id: updated.id,
      category: updated.category,
      subject: updated.subject,
      status: updated.status,
      memberName: updated.user.fullName,
      memberEmail: updated.user.email,
      createdAt: updated.createdAt.toISOString(),
      messages: updated.messages.map((message) => ({
        id: message.id,
        isAdmin: message.isAdmin,
        message: message.message,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}
