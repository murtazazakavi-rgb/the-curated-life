import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { EmailStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";

type SendEmailInput = {
  to: string;
  templateKey: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

async function logEmail(input: {
  toEmail: string;
  templateKey: string;
  status: EmailStatus;
  providerMessageId?: string;
}) {
  try {
    await getPrisma().emailLog.create({
      data: input,
    });
  } catch {
    // Email logging should never block the user-facing flow.
  }
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.EMAIL_FROM;

  if (!hasSmtp) {
    await logEmail({
      toEmail: input.to,
      templateKey: input.templateKey,
      status: EmailStatus.SKIPPED,
    });
    return { skipped: true };
  }

  try {
    const result = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    await logEmail({
      toEmail: input.to,
      templateKey: input.templateKey,
      status: EmailStatus.SENT,
      providerMessageId: result.messageId,
    });

    return { messageId: result.messageId };
  } catch (error) {
    await logEmail({
      toEmail: input.to,
      templateKey: input.templateKey,
      status: EmailStatus.FAILED,
    });

    throw error;
  }
}
