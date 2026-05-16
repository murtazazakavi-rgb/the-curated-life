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

export type EmailDeliveryResult = {
  status: "sent" | "skipped";
  provider: "resend" | "smtp" | "none";
  messageId?: string;
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

function hasResendConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD &&
      process.env.EMAIL_FROM,
  );
}

function resendErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
    if (typeof record.name === "string") return record.name;
  }

  return `Resend API request failed with status ${status}.`;
}

function parseResendPayload(responseText: string) {
  if (!responseText) return {};

  try {
    return JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    return { message: responseText };
  }
}

async function sendWithResend(input: SendEmailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  const responseText = await response.text();
  const payload = parseResendPayload(responseText);

  if (!response.ok) {
    throw new Error(resendErrorMessage(payload, response.status));
  }

  if (typeof payload.id !== "string") {
    throw new Error("Resend did not return an email id.");
  }

  return { messageId: payload.id };
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  if (!hasResendConfig() && !hasSmtpConfig()) {
    await logEmail({
      toEmail: input.to,
      templateKey: input.templateKey,
      status: EmailStatus.SKIPPED,
    });

    return { status: "skipped", provider: "none" } satisfies EmailDeliveryResult;
  }

  try {
    if (hasResendConfig()) {
      const result = await sendWithResend(input);

      await logEmail({
        toEmail: input.to,
        templateKey: input.templateKey,
        status: EmailStatus.SENT,
        providerMessageId: result.messageId,
      });

      return {
        status: "sent",
        provider: "resend",
        messageId: result.messageId,
      } satisfies EmailDeliveryResult;
    }

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

    return {
      status: "sent",
      provider: "smtp",
      messageId: result.messageId,
    } satisfies EmailDeliveryResult;
  } catch (error) {
    await logEmail({
      toEmail: input.to,
      templateKey: input.templateKey,
      status: EmailStatus.FAILED,
    });

    throw error;
  }
}
