export type EmailTemplate = {
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

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function siteUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000";

  return `${base.replace(/\/$/, "")}${path}`;
}

export function baseEmail({
  title,
  eyebrow,
  body,
  ctaLabel,
  ctaUrl,
  note,
}: BaseEmailInput) {
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(eyebrow);
  const safeBody = body;
  const safeNote = note ? escapeHtml(note) : "";
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : "";
  const safeCtaUrl = ctaUrl ? escapeHtml(ctaUrl) : "";

  const cta =
    safeCtaLabel && safeCtaUrl
      ? `<p style="margin:34px 0 0;"><a href="${safeCtaUrl}" style="display:inline-block;background:#A77945;color:#FFF8EC;text-decoration:none;border-radius:999px;padding:15px 24px;font:600 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;">${safeCtaLabel}</a></p>`
      : "";

  const noteBlock = safeNote
    ? `<p style="margin:32px 0 0;color:#7B7064;font:300 14px/1.7 Inter,Arial,sans-serif;">${safeNote}</p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#F5F1EA;color:#0F0F0F;">
    <div style="padding:34px 18px;">
      <div style="max-width:640px;margin:0 auto;background:#12110F;border:1px solid rgba(167,121,69,.32);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(15,15,15,.14);">
        <div style="padding:34px 30px 24px;color:#F5F1EA;">
          <p style="margin:0;color:#C99B65;font:700 11px/1.5 Inter,Arial,sans-serif;letter-spacing:.22em;text-transform:uppercase;">The Curated Life</p>
          <p style="margin:24px 0 0;color:#D8CBB8;font:600 10px/1.5 Inter,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;">${safeEyebrow}</p>
          <h1 style="margin:16px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.05;letter-spacing:0;color:#FFF8EC;">${safeTitle}</h1>
        </div>
        <div style="background:#FFFDF8;padding:34px 30px 38px;">
          <div style="margin:0;color:#3B3933;font:300 16px/1.85 Inter,Arial,sans-serif;">${safeBody}</div>
          ${cta}
          ${noteBlock}
          <div style="margin-top:38px;padding-top:22px;border-top:1px solid rgba(15,15,15,.1);color:#A07C5B;font:600 10px/1.6 Inter,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;">
            thecuratedlife.india@gmail.com
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function asText(title: string, body: string, ctaUrl?: string) {
  return [
    title,
    body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    ctaUrl ? `Open: ${ctaUrl}` : undefined,
    "The Curated Life",
    "thecuratedlife.india@gmail.com",
  ]
    .filter(Boolean)
    .join("\n\n");
}
