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
      ? `<p style="margin:34px 0 0;"><a href="${safeCtaUrl}" style="display:inline-block;background:#0F0F0F;color:#F5F1EA;text-decoration:none;border:1px solid #0F0F0F;border-radius:999px;padding:15px 24px;font:600 11px/1.2 Inter,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;">${safeCtaLabel}</a></p>`
      : "";

  const noteBlock = safeNote
    ? `<p style="margin:32px 0 0;border-left:2px solid #A07C5B;padding:2px 0 2px 16px;color:#6F655B;font:300 14px/1.7 Inter,Arial,sans-serif;">${safeNote}</p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#F5F1EA;color:#0F0F0F;-webkit-font-smoothing:antialiased;">
    <div style="padding:32px 14px;background:#F5F1EA;">
      <div style="max-width:660px;margin:0 auto;border:1px solid rgba(15,15,15,.08);border-radius:18px;overflow:hidden;background:#FFFaf2;box-shadow:0 24px 70px rgba(15,15,15,.12);">
        <div style="background:#0F0F0F;padding:20px 26px 0;color:#F5F1EA;">
          <p style="margin:0;color:#F5F1EA;font:600 12px/1.5 Georgia,'Times New Roman',serif;letter-spacing:.24em;text-transform:uppercase;">The Curated Life</p>
          <div style="height:1px;background:rgba(245,241,234,.14);margin:18px 0 0;"></div>
        </div>
        <div style="background:#0F0F0F;padding:28px 26px 34px;color:#F5F1EA;">
          <p style="margin:0;color:#D8CBB8;font:600 10px/1.5 Inter,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;">${safeEyebrow}</p>
          <h1 style="margin:16px 0 0;max-width:520px;font-family:Georgia,'Times New Roman',serif;font-weight:300;font-size:42px;line-height:1.02;letter-spacing:0;color:#F5F1EA;">${safeTitle}</h1>
          <div style="width:42px;height:1px;background:#A07C5B;margin:22px 0 0;"></div>
        </div>
        <div style="background:#FFFaf2;padding:34px 26px 38px;">
          <div style="margin:0;color:#2D2A25;font:300 16px/1.85 Inter,Arial,sans-serif;">${safeBody}</div>
          ${cta}
          ${noteBlock}
          <div style="margin-top:38px;padding-top:22px;border-top:1px solid rgba(15,15,15,.1);">
            <p style="margin:0;color:#A07C5B;font:600 10px/1.6 Inter,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;">Reference-only · Personally reviewed</p>
            <p style="margin:10px 0 0;color:#6F655B;font:300 13px/1.7 Inter,Arial,sans-serif;">The Curated Life · Mumbai<br/><a href="mailto:thecuratedlife.india@gmail.com" style="color:#6F655B;text-decoration:underline;text-underline-offset:3px;">thecuratedlife.india@gmail.com</a></p>
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
