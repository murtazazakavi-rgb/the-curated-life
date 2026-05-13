type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type BaseEmailInput = {
  title: string;
  eyebrow: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  note?: string;
};

function baseEmail({ title, eyebrow, body, ctaLabel, ctaUrl, note }: BaseEmailInput) {
  const cta = ctaLabel && ctaUrl
    ? `<p style="margin:34px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#0F0F0F;color:#F5F1EA;text-decoration:none;border-radius:999px;padding:15px 24px;font:500 11px/1.2 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;">${ctaLabel}</a></p>`
    : "";

  const noteBlock = note
    ? `<p style="margin:32px 0 0;color:#6E6258;font:300 14px/1.7 Inter,sans-serif;">${note}</p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#F5F1EA;color:#0F0F0F;">
    <div style="padding:34px 18px;">
      <div style="max-width:620px;margin:0 auto;background:#FFFDF8;border:1px solid rgba(15,15,15,.08);border-radius:24px;overflow:hidden;box-shadow:0 30px 80px rgba(15,15,15,.08);">
        <div style="background:#0F0F0F;color:#F5F1EA;padding:34px 30px 42px;">
          <p style="margin:0;color:#D8CBB8;font:500 10px/1.5 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;">${eyebrow}</p>
          <h1 style="margin:22px 0 0;font-family:'Cormorant Garamond',serif;font-weight:300;font-size:42px;line-height:.98;letter-spacing:0;">${title}</h1>
        </div>
        <div style="padding:34px 30px 38px;">
          <p style="margin:0;color:#3B3933;font:300 16px/1.85 Inter,sans-serif;">${body}</p>
          ${cta}
          ${noteBlock}
          <div style="margin-top:38px;padding-top:22px;border-top:1px solid rgba(15,15,15,.1);color:#A07C5B;font:500 10px/1.6 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;">The Curated Life</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function asText(title: string, body: string, ctaUrl?: string) {
  return [title, body, ctaUrl ? `Open: ${ctaUrl}` : undefined, "The Curated Life"]
    .filter(Boolean)
    .join("\n\n");
}

export function requestReceivedEmail(name: string): EmailTemplate {
  const title = "We have received your request.";
  const body = `Dear ${name}, thank you for writing to The Curated Life. Every request is read personally, with care and without urgency. If there is a natural fit, we will follow up by email with next steps.`;
  return {
    subject: "We have received your request",
    html: baseEmail({
      title,
      eyebrow: "Request Received",
      body,
      note: "Access is selective so the room can remain thoughtful, warm, and intimate.",
    }),
    text: asText(title, body),
  };
}

export function accessApprovedEmail(name: string, loginUrl: string): EmailTemplate {
  const title = "Access has been personally granted.";
  const body = `Dear ${name}, your request has been approved. You can now log in with Google using this email address to view private invitations and request your place at upcoming experiences.`;
  return {
    subject: "Access granted to The Curated Life",
    html: baseEmail({
      title,
      eyebrow: "Access Granted",
      body,
      ctaLabel: "Enter the Circle",
      ctaUrl: loginUrl,
      note: "Please use the same email address that received this invitation.",
    }),
    text: asText(title, body, loginUrl),
  };
}

export function accessDeclinedEmail(name: string): EmailTemplate {
  const title = "A note about your request.";
  const body = `Dear ${name}, thank you for your considered request. We are keeping the first circle intentionally small, and we are not able to extend access at this time. We are grateful you reached out.`;
  return {
    subject: "A note from The Curated Life",
    html: baseEmail({ title, eyebrow: "Request Update", body }),
    text: asText(title, body),
  };
}

export function waitlistedEmail(name: string): EmailTemplate {
  const title = "Your request is being held with care.";
  const body = `Dear ${name}, thank you for your request. We are keeping the first gatherings very intimate, so we have placed your name on the waitlist and will write when a considered opening becomes available.`;
  return {
    subject: "Your Curated Life request is on the waitlist",
    html: baseEmail({ title, eyebrow: "Waitlist", body }),
    text: asText(title, body),
  };
}

export function referralInvitationEmail(input: {
  referredName: string;
  referrerName: string;
  requestUrl: string;
  note?: string | null;
}): EmailTemplate {
  const title = "You have been thoughtfully referred.";
  const body = `${input.referredName}, ${input.referrerName} thought you may appreciate The Curated Life, a private circle for intimate experiences and thoughtful introductions. If this feels aligned, you are welcome to request access below.${input.note ? ` A note from ${input.referrerName}: "${input.note}"` : ""}`;
  return {
    subject: `${input.referrerName} referred you to The Curated Life`,
    html: baseEmail({
      title,
      eyebrow: "Private Referral",
      body,
      ctaLabel: "Request Access",
      ctaUrl: input.requestUrl,
    }),
    text: asText(title, body, input.requestUrl),
  };
}

export function reservationReceivedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your reservation request has been received.";
  const body = `Dear ${input.name}, we have received your request for ${input.experienceTitle}. We will confirm personally once the guest list is reviewed.`;
  return {
    subject: `Reservation request received: ${input.experienceTitle}`,
    html: baseEmail({ title, eyebrow: "Reservation Requested", body }),
    text: asText(title, body),
  };
}

export function reservationConfirmedEmail(input: {
  name: string;
  experienceTitle: string;
}): EmailTemplate {
  const title = "Your place is confirmed.";
  const body = `Dear ${input.name}, your place for ${input.experienceTitle} has been confirmed. Details will follow by email before the gathering.`;
  return {
    subject: `Your place is confirmed: ${input.experienceTitle}`,
    html: baseEmail({ title, eyebrow: "Reservation Confirmed", body }),
    text: asText(title, body),
  };
}

export function eventReminderEmail(input: {
  name: string;
  experienceTitle: string;
  when: string;
}): EmailTemplate {
  const title = "A quiet reminder.";
  const body = `Dear ${input.name}, ${input.experienceTitle} is coming up on ${input.when}. We look forward to welcoming you personally.`;
  return {
    subject: `Reminder: ${input.experienceTitle}`,
    html: baseEmail({ title, eyebrow: "Event Reminder", body }),
    text: asText(title, body),
  };
}
