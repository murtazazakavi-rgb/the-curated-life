const INDIA_TIME_ZONE = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function parseIndiaDateTimeLocal(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return new Date(Number.NaN);
  }

  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }

  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  return new Date(`${withSeconds}${INDIA_OFFSET}`);
}

export function formatIndiaDateTimeLocal(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  return `${partValue(parts, "year")}-${partValue(parts, "month")}-${partValue(
    parts,
    "day",
  )}T${partValue(parts, "hour")}:${partValue(parts, "minute")}`;
}
