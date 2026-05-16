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
  experiences?: Array<{ title: string; dateTime: string | Date; location: string }>;
}): EmailTemplate {
  const title = "Access has been personally granted.";
  const experienceList = input.experiences?.length
    ? `<div style="margin:22px 0 0;padding:16px;border:1px solid rgba(15,15,15,.08);border-radius:18px;background:#fffaf2;">
        <p style="margin:0 0 10px;color:#8B7A68;font:600 10px/1.4 Inter,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;">Live experiences waiting inside</p>
        ${input.experiences
          .slice(0, 3)
          .map(
            (experience) =>
              `<p style="margin:0 0 10px;color:#2A2925;font:300 14px/1.55 Inter,Arial,sans-serif;"><strong>${escapeHtml(experience.title)}</strong><br/>${escapeHtml(experience.location)}</p>`,
          )
          .join("")}
      </div>`
    : "";
  const body = `Dear ${escapeHtml(input.name)}, your request has been approved. Please set your password using the private link below, then sign in with this email address. Live experiences are waiting inside.`;

  return {
    subject: "Set your password for The Curated Life",
    html: baseEmail({
      title,
      eyebrow: "Access Granted",
      body: `${paragraph(
        `Dear ${input.name}, your request has been approved. Please set your password using the private link below, then sign in with this email address. Live experiences are waiting inside.`,
      )}${experienceList}`,
      ctaLabel: "Set Password",
      ctaUrl: input.setupUrl,
      note: "For your security, this link expires and can only be used once.",
    }),
    text: asText(title, body, input.setupUrl),
  };
}

export function directMemberSetPasswordEmail(input: {
  name: string;
  setupUrl: string;
}): EmailTemplate {
  const title = "You have been chosen for The Curated Life.";
  const body = `Dear ${escapeHtml(input.name)}, you have been personally chosen and added to The Curated Life circle. Please set your password using the private link below, then sign in with this email address.`;

  return {
    subject: "You have been added to The Curated Life",
    html: baseEmail({
      title,
      eyebrow: "Circle Access",
      body: paragraph(
        `Dear ${input.name}, you have been personally chosen and added to The Curated Life circle. Please set your password using the private link below, then sign in with this email address.`,
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

export function eventAnnouncementEmail(input: {
  name: string;
  experienceTitle: string;
  when: string;
  location: string;
  memberUrl: string;
  isPrivate?: boolean;
}): EmailTemplate {
  const title = input.isPrivate
    ? "A private invitation is waiting."
    : "A new invitation is waiting.";
  const body = `Dear ${escapeHtml(input.name)}, ${escapeHtml(input.experienceTitle)} has just opened inside The Curated Life. It is planned for ${escapeHtml(input.when)} at ${escapeHtml(input.location)}. We would be glad to have you consider joining if the timing feels right.`;

  return {
    subject: `New invitation: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: input.isPrivate ? "Private Invitation" : "New Invitation",
      body: [
        paragraph(
          `Dear ${input.name}, ${input.experienceTitle} has just opened inside The Curated Life.`,
        ),
        details([
          ["When", input.when],
          ["Where", input.location],
        ]),
      ].join(""),
      ctaLabel: "View Invitation",
      ctaUrl: input.memberUrl,
      note: "Places are intentionally limited and reviewed personally.",
    }),
    text: asText(title, body, input.memberUrl),
  };
}

export function eventPostponedEmail(input: {
  name: string;
  experienceTitle: string;
  message: string;
  memberUrl: string;
}): EmailTemplate {
  const title = "This experience has been postponed.";
  const body = `Dear ${escapeHtml(input.name)}, we need to postpone ${escapeHtml(input.experienceTitle)} for now. ${escapeHtml(input.message)} Your place remains linked to the experience, and we will write again with the next update.`;

  return {
    subject: `Update: ${input.experienceTitle} has been postponed`,
    html: baseEmail({
      title,
      eyebrow: "Experience Update",
      body: paragraph(
        `Dear ${input.name}, we need to postpone ${input.experienceTitle} for now. ${input.message} Your place remains linked to the experience, and we will write again with the next update.`,
      ),
      ctaLabel: "View Update",
      ctaUrl: input.memberUrl,
    }),
    text: asText(title, body, input.memberUrl),
  };
}

export function eventCancelledEmail(input: {
  name: string;
  experienceTitle: string;
  reason: string;
  memberUrl: string;
}): EmailTemplate {
  const title = "This experience has been cancelled.";
  const body = `Dear ${escapeHtml(input.name)}, we are sorry to share that ${escapeHtml(input.experienceTitle)} has been cancelled. ${escapeHtml(input.reason)} We know a place in your calendar is personal, and we are grateful for your understanding.`;

  return {
    subject: `Update: ${input.experienceTitle} has been cancelled`,
    html: baseEmail({
      title,
      eyebrow: "Experience Update",
      body: paragraph(
        `Dear ${input.name}, we are sorry to share that ${input.experienceTitle} has been cancelled. ${input.reason} We know a place in your calendar is personal, and we are grateful for your understanding.`,
      ),
      ctaLabel: "View Update",
      ctaUrl: input.memberUrl,
    }),
    text: asText(title, body, input.memberUrl),
  };
}

export function eventDetailsEmail(input: {
  name: string;
  subject: string;
  experienceTitle: string;
  when: string;
  location: string;
  meetingPoint: string;
  arrivalWindow?: string | null;
  locationDetails?: string | null;
  dressCode?: string | null;
  whatToBring?: string | null;
  contact?: string | null;
  note?: string | null;
  memberUrl: string;
}): EmailTemplate {
  const title = "Your event details are ready.";
  const rows: Array<[string, string | null | undefined]> = [
    ["Experience", input.experienceTitle],
    ["When", input.when],
    ["Where", input.location],
    ["Meeting point", input.meetingPoint],
    ["Arrival", input.arrivalWindow],
    ["Location notes", input.locationDetails],
    ["Dress code", input.dressCode],
    ["What to bring", input.whatToBring],
    ["Contact", input.contact],
  ];
  const bodyText = [
    `Dear ${input.name}, here are the details for ${input.experienceTitle}.`,
    `When: ${input.when}`,
    `Where: ${input.location}`,
    `Meeting point: ${input.meetingPoint}`,
    input.arrivalWindow ? `Arrival: ${input.arrivalWindow}` : "",
    input.locationDetails ? `Location notes: ${input.locationDetails}` : "",
    input.dressCode ? `Dress code: ${input.dressCode}` : "",
    input.whatToBring ? `What to bring: ${input.whatToBring}` : "",
    input.contact ? `Contact: ${input.contact}` : "",
    input.note ? `Note: ${input.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: input.subject,
    html: baseEmail({
      title,
      eyebrow: "Event Details",
      body: [
        paragraph(
          `Dear ${input.name}, here are the details for ${input.experienceTitle}.`,
        ),
        details(rows),
        input.note ? paragraph(input.note) : "",
      ].join(""),
      ctaLabel: "View Reservation",
      ctaUrl: input.memberUrl,
      note: "If anything changes, we will write again by email.",
    }),
    text: asText(title, bodyText, input.memberUrl),
  };
}

export function adminCancellationRequestedEmail(input: {
  memberName: string;
  memberEmail: string;
  experienceTitle: string;
  reason: string;
  note?: string | null;
  adminUrl: string;
}): EmailTemplate {
  const title = "A cancellation request needs review.";
  const body = `${escapeHtml(input.memberName)} requested cancellation for ${escapeHtml(input.experienceTitle)}. Reason: ${escapeHtml(input.reason)}. Note: ${escapeHtml(input.note || "-")}`;

  return {
    subject: `Cancellation requested: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Admin Review",
      body: details([
        ["Member", input.memberName],
        ["Email", input.memberEmail],
        ["Experience", input.experienceTitle],
        ["Reason", input.reason],
        ["Note", input.note],
      ]),
      ctaLabel: "Review Request",
      ctaUrl: input.adminUrl,
    }),
    text: asText(title, body, input.adminUrl),
  };
}

export function cancellationApprovedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your cancellation request has been approved.";
  const body = `Dear ${escapeHtml(input.name)}, your place for ${escapeHtml(input.experienceTitle)} has been released. Thank you for letting us know with care.`;

  return {
    subject: `Cancellation approved: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Cancellation Approved",
      body: paragraph(
        `Dear ${input.name}, your place for ${input.experienceTitle} has been released. Thank you for letting us know with care.`,
      ),
    }),
    text: asText(title, body),
  };
}

export function cancellationDeclinedEmail(input: {
  name: string;
  experienceTitle: string;
  reply?: string | null;
}): EmailTemplate {
  const title = "A note about your cancellation request.";
  const body = `Dear ${escapeHtml(input.name)}, your place for ${escapeHtml(input.experienceTitle)} is still being held. ${escapeHtml(input.reply || "If anything has changed, you can write back to us directly.")}`;

  return {
    subject: `Cancellation request update: ${input.experienceTitle}`,
    html: baseEmail({
      title,
      eyebrow: "Cancellation Update",
      body: paragraph(
        `Dear ${input.name}, your place for ${input.experienceTitle} is still being held. ${input.reply || "If anything has changed, you can write back to us directly."}`,
      ),
    }),
    text: asText(title, body),
  };
}

export function adminFeedbackReceivedEmail(input: {
  memberName: string;
  memberEmail: string;
  category: string;
  subject: string;
  message: string;
  adminUrl: string;
}): EmailTemplate {
  const title = "New member feedback has arrived.";
  const body = `${escapeHtml(input.memberName)} sent ${escapeHtml(input.category)}: ${escapeHtml(input.subject)}. ${escapeHtml(input.message)}`;

  return {
    subject: `New feedback: ${input.subject}`,
    html: baseEmail({
      title,
      eyebrow: "Member Feedback",
      body: details([
        ["Member", input.memberName],
        ["Email", input.memberEmail],
        ["Category", input.category],
        ["Subject", input.subject],
        ["Message", input.message],
      ]),
      ctaLabel: "Open Feedback",
      ctaUrl: input.adminUrl,
    }),
    text: asText(title, body, input.adminUrl),
  };
}

export function feedbackReplyEmail(input: {
  name: string;
  subject: string;
  reply: string;
  memberUrl: string;
}): EmailTemplate {
  const title = "A reply from The Curated Life.";
  const body = `Dear ${escapeHtml(input.name)}, we have replied to your note about ${escapeHtml(input.subject)}. ${escapeHtml(input.reply)}`;

  return {
    subject: `Reply from The Curated Life: ${input.subject}`,
    html: baseEmail({
      title,
      eyebrow: "Member Note",
      body: paragraph(
        `Dear ${input.name}, we have replied to your note about ${input.subject}. ${input.reply}`,
      ),
      ctaLabel: "View Reply",
      ctaUrl: input.memberUrl,
    }),
    text: asText(title, body, input.memberUrl),
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
