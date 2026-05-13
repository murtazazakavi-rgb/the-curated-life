import {
  asText,
  baseEmail,
  escapeHtml,
  siteUrl,
  type EmailTemplate,
} from "./base";

function paragraph(value: string) {
  return `<p style="margin:0 0 16px;">${escapeHtml(value)}</p>`;
}

function details(rows: Array<[string, string | null | undefined]>) {
  return `<table style="width:100%;border-collapse:collapse;margin:22px 0 0;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 0;border-top:1px solid rgba(15,15,15,.08);color:#8B7A68;font:600 10px/1.4 Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;width:38%;">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid rgba(15,15,15,.08);color:#2A2925;font:300 14px/1.55 Inter,Arial,sans-serif;">${escapeHtml(value || "-")}</td></tr>`,
    )
    .join("")}</table>`;
}

export function accessRequestReceivedEmail(name: string): EmailTemplate {
  const title = "We have received your request.";
  const body = `Dear ${escapeHtml(name)}, thank you for writing to The Curated Life. Every request is read personally, with care and without urgency. If there is a natural fit, we will follow up by email with next steps.`;

  return {
    subject: "We have received your request",
    html: baseEmail({
      title,
      eyebrow: "Request Received",
      body: paragraph(
        `Dear ${name}, thank you for writing to The Curated Life. Every request is read personally, with care and without urgency. If there is a natural fit, we will follow up by email with next steps.`,
      ),
      note: "Access is selective so the room can remain thoughtful, warm, and intimate.",
    }),
    text: asText(title, body),
  };
}

export function adminNewAccessRequestEmail(input: {
  fullName: string;
  email: string;
  phone: string;
  referredBy?: string | null;
  interests: string[];
  preferredExperiences: string[];
  message: string;
  reviewUrl?: string;
}): EmailTemplate {
  const title = "A new access request is waiting.";
  const reviewUrl = input.reviewUrl ?? siteUrl("/admin");
  const body = [
    paragraph("A new application has been received and is ready for review."),
    details([
      ["Name", input.fullName],
      ["Email", input.email],
      ["Phone", input.phone],
      ["Referred by", input.referredBy],
      ["Interests", input.interests.join(", ")],
      ["Preferred experiences", input.preferredExperiences.join(", ")],
      ["Message", input.message],
    ]),
  ].join("");

  return {
    subject: `New access request: ${input.fullName}`,
    html: baseEmail({
      title,
      eyebrow: "Admin Review",
      body,
      ctaLabel: "Review in Admin",
      ctaUrl: reviewUrl,
    }),
    text: asText(
      title,
      `Name: ${input.fullName}\nEmail: ${input.email}\nPhone: ${input.phone}\nReferred by: ${input.referredBy || "-"}\nInterests: ${input.interests.join(", ")}\nPreferred experiences: ${input.preferredExperiences.join(", ")}\nMessage: ${input.message}`,
      reviewUrl,
    ),
  };
}

export function accessApprovedSetPasswordEmail(input: {
  name: string;
  setupUrl: string;
}): EmailTemplate {
  const title = "Access has been personally granted.";
  const body = `Dear ${escapeHtml(input.name)}, your request has been approved. Please set your password using the private link below, then sign in with this email address.`;

  return {
    subject: "Set your password for The Curated Life",
    html: baseEmail({
      title,
      eyebrow: "Access Granted",
      body: paragraph(
        `Dear ${input.name}, your request has been approved. Please set your password using the private link below, then sign in with this email address.`,
      ),
      ctaLabel: "Set Password",
      ctaUrl: input.setupUrl,
      note: "For your security, this link expires and can only be used once.",
    }),
    text: asText(title, body, input.setupUrl),
  };
}

export function accessWaitlistedEmail(name: string): EmailTemplate {
  const title = "Your request is being held with care.";
  const body = `Dear ${escapeHtml(name)}, thank you for your request. We are keeping the first gatherings very intimate, so we have placed your name on the waitlist and will write when a considered opening becomes available.`;

  return {
    subject: "Your Curated Life request is on the waitlist",
    html: baseEmail({
      title,
      eyebrow: "Waitlist",
      body: paragraph(
        `Dear ${name}, thank you for your request. We are keeping the first gatherings very intimate, so we have placed your name on the waitlist and will write when a considered opening becomes available.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function accessDeclinedEmail(name: string): EmailTemplate {
  const title = "A note about your request.";
  const body = `Dear ${escapeHtml(name)}, thank you for your considered request. We are keeping the first circle intentionally small, and we are not able to extend access at this time. We are grateful you reached out.`;

  return {
    subject: "A note from The Curated Life",
    html: baseEmail({
      title,
      eyebrow: "Request Update",
      body: paragraph(
        `Dear ${name}, thank you for your considered request. We are keeping the first circle intentionally small, and we are not able to extend access at this time. We are grateful you reached out.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function passwordResetEmail(input: {
  name: string;
  resetUrl: string;
}): EmailTemplate {
  const title = "Reset your password.";
  const body = `Dear ${escapeHtml(input.name)}, use the private link below to choose a new password for The Curated Life.`;

  return {
    subject: "Reset your Curated Life password",
    html: baseEmail({
      title,
      eyebrow: "Password Reset",
      body: paragraph(
        `Dear ${input.name}, use the private link below to choose a new password for The Curated Life.`,
      ),
      ctaLabel: "Reset Password",
      ctaUrl: input.resetUrl,
      note: "If you did not ask for this, you can safely ignore this email.",
    }),
    text: asText(title, body, input.resetUrl),
  };
}

export function referralInvitationEmail(input: {
  referredName: string;
  referrerName: string;
  requestUrl: string;
  note?: string | null;
}): EmailTemplate {
  const note = input.note
    ? ` A note from ${input.referrerName}: "${input.note}"`
    : "";
  const title = "You have been thoughtfully referred.";
  const body = `${escapeHtml(input.referredName)}, ${escapeHtml(input.referrerName)} thought you may appreciate The Curated Life, a private circle for intimate experiences and thoughtful introductions. If this feels aligned, you are welcome to request access below.${escapeHtml(note)}`;

  return {
    subject: `${input.referrerName} referred you to The Curated Life`,
    html: baseEmail({
      title,
      eyebrow: "Private Referral",
      body: paragraph(
        `${input.referredName}, ${input.referrerName} thought you may appreciate The Curated Life, a private circle for intimate experiences and thoughtful introductions. If this feels aligned, you are welcome to request access below.${note}`,
      ),
      ctaLabel: "Request Access",
      ctaUrl: input.requestUrl,
    }),
    text: asText(title, body, input.requestUrl),
  };
}

export function reservationRequestedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your reservation request has been received.";
  const body = `Dear ${escapeHtml(input.name)}, we have received your request for ${escapeHtml(input.experienceTitle)}. We will confirm personally once the guest list is reviewed.`;

  return {
    subject: `Reservation request received: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Reservation Requested",
      body: paragraph(
        `Dear ${input.name}, we have received your request for ${input.experienceTitle}. We will confirm personally once the guest list is reviewed.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function reservationConfirmedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your place is confirmed.";
  const body = `Dear ${escapeHtml(input.name)}, your place for ${escapeHtml(input.experienceTitle)} has been confirmed. Details will follow by email before the gathering.`;

  return {
    subject: `Your place is confirmed: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Reservation Confirmed",
      body: paragraph(
        `Dear ${input.name}, your place for ${input.experienceTitle} has been confirmed. Details will follow by email before the gathering.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function reservationWaitlistedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "You are on the waitlist.";
  const body = `Dear ${escapeHtml(input.name)}, ${escapeHtml(input.experienceTitle)} is currently full or being carefully balanced, so we have placed your request on the waitlist.`;

  return {
    subject: `Waitlisted: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Reservation Waitlisted",
      body: paragraph(
        `Dear ${input.name}, ${input.experienceTitle} is currently full or being carefully balanced, so we have placed your request on the waitlist.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function reservationCancelledEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your reservation has been cancelled.";
  const body = `Dear ${escapeHtml(input.name)}, your reservation for ${escapeHtml(input.experienceTitle)} has been cancelled.`;

  return {
    subject: `Reservation cancelled: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Reservation Cancelled",
      body: paragraph(
        `Dear ${input.name}, your reservation for ${input.experienceTitle} has been cancelled.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function eventReminderEmail(input: {
  name: string;
  experienceTitle: string;
  when: string;
}): EmailTemplate {
  const title = "A quiet reminder.";
  const body = `Dear ${escapeHtml(input.name)}, ${escapeHtml(input.experienceTitle)} is coming up on ${escapeHtml(input.when)}. We look forward to welcoming you personally.`;

  return {
    subject: `Reminder: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Event Reminder",
      body: paragraph(
        `Dear ${input.name}, ${input.experienceTitle} is coming up on ${input.when}. We look forward to welcoming you personally.`,
      ),
    }),
    text: asText(title, body),
  };
}

export const requestReceivedEmail = accessRequestReceivedEmail;
export const accessApprovedEmail = (name: string, setupUrl: string) =>
  accessApprovedSetPasswordEmail({ name, setupUrl });
export const waitlistedEmail = accessWaitlistedEmail;
export const reservationReceivedEmail = reservationRequestedEmail;
