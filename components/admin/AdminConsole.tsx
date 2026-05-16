"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { formatIndiaDateTimeLocal } from "@/lib/dates/india";
import { formatExperienceDate } from "@/lib/data/experiences";

type AccessRequestView = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  referredBy?: string | null;
  interests: string[];
  preferredExperiences: string[];
  message: string;
  status: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  adminNote?: string | null;
  createdAt: string;
};

type ExperienceAttendeeView = {
  id: string;
  status: string;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  cancellationRequestedAt?: string | null;
  cancellationReason?: string | null;
};

type ExperienceView = {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  dateTime: string;
  imageUrl: string;
  hostedByLabel: string;
  hostName: string;
  hostTitle?: string | null;
  hostBio?: string | null;
  seatsTotal?: number | null;
  isVisible: boolean;
  isInviteOnly: boolean;
  isArchived: boolean;
  status: string;
  publishedAt?: string | null;
  announcementSentAt?: string | null;
  postponedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  postponementMessage?: string | null;
  visibilityType: string;
  attendeeVisibilityEnabled: boolean;
  selectedMemberIds: string[];
  confirmedCount: number;
  requestedCount: number;
  waitlistedCount: number;
  cancellationRequestCount: number;
  reservationCount: number;
  remainingSeats?: number | null;
  attendees: ExperienceAttendeeView[];
};

type ExperienceApiView = Omit<
  ExperienceView,
  | "confirmedCount"
  | "requestedCount"
  | "waitlistedCount"
  | "cancellationRequestCount"
  | "reservationCount"
  | "remainingSeats"
  | "selectedMemberIds"
  | "attendees"
> & {
  confirmedCount?: number;
  requestedCount?: number;
  waitlistedCount?: number;
  cancellationRequestCount?: number;
  reservationCount?: number;
  remainingSeats?: number | null;
  selectedMemberIds?: string[];
  attendees?: ExperienceAttendeeView[];
};

type ReservationView = {
  id: string;
  status: string;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  experienceTitle: string;
  seatsTotal?: number | null;
  cancellationRequestedAt?: string | null;
  cancellationReason?: string | null;
  cancellationNote?: string | null;
  previousStatus?: string | null;
};

type ReferralView = {
  id: string;
  referredName: string;
  referredEmail: string;
  relationship: string;
  status: string;
  referrerName: string;
};

type MemberView = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  accessStatus: string;
  passwordSetAt?: string | null;
  suspendedAt?: string | null;
  createdAt: string;
};

type EmailLogView = {
  id: string;
  toEmail: string;
  templateKey: string;
  status: string;
  providerMessageId?: string | null;
  createdAt: string;
};

type FeedbackThreadView = {
  id: string;
  category: string;
  subject: string;
  status: string;
  memberName: string;
  memberEmail: string;
  createdAt: string;
  messages: Array<{
    id: string;
    isAdmin: boolean;
    message: string;
    createdAt: string;
  }>;
};

type AdminConsoleProps = {
  requests: AccessRequestView[];
  experiences: ExperienceView[];
  reservations: ReservationView[];
  referrals: ReferralView[];
  members: MemberView[];
  emailLogs: EmailLogView[];
  feedbackThreads: FeedbackThreadView[];
};

type AdminTab =
  | "dashboard"
  | "requests"
  | "members"
  | "events"
  | "reservations"
  | "feedback"
  | "referrals"
  | "emails";

type EventFilter = "ACTIVE" | "LIVE" | "NEEDS_REVIEW" | "DRAFT" | "PAST" | "ALL";

type EventSort = "PRIORITY" | "DATE_ASC" | "DATE_DESC" | "JOINED_DESC" | "OPEN_ASC";

type Toast = {
  tone: "success" | "error";
  message: string;
} | null;

type SetupEmailDeliveryView = {
  status: "sent" | "skipped" | "failed" | "not_needed";
  provider: string;
  message?: string;
} | null;

type EventDetailsDeliveryView = {
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
};

type AccessAction = "approve" | "decline" | "waitlist" | "resend_setup";

type ExperiencePayload = {
  title: string;
  slug: string;
  description: string;
  location: string;
  dateTime: string;
  imageUrl: string;
  hostedByLabel: string;
  hostName: string;
  hostTitle: string;
  hostBio: string;
  seatsTotal: number | null;
  isVisible: boolean;
  isInviteOnly: boolean;
  isArchived: boolean;
  status: string;
  visibilityType: string;
  attendeeVisibilityEnabled: boolean;
  selectedMemberIds: string[];
};

type ImageUploadStatus =
  | "idle"
  | "compressing"
  | "uploading"
  | "uploaded"
  | "error";

type ImageUploadFieldProps = {
  defaultValue?: string;
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "requests", label: "Access Requests" },
  { id: "members", label: "Members" },
  { id: "events", label: "Events" },
  { id: "reservations", label: "Reservations" },
  { id: "feedback", label: "Feedback" },
  { id: "referrals", label: "Referrals" },
  { id: "emails", label: "Emails" },
];

const MAX_EVENT_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_EVENT_IMAGE_WIDTH = 1800;
const RESERVATION_STATUS_GROUPS = [
  "CONFIRMED",
  "REQUESTED",
  "WAITLISTED",
  "CANCELLATION_REQUESTED",
  "CANCELLED",
];

const eventSortOptions: Array<{ id: EventSort; label: string }> = [
  { id: "PRIORITY", label: "Priority" },
  { id: "DATE_ASC", label: "Soonest" },
  { id: "DATE_DESC", label: "Latest" },
  { id: "JOINED_DESC", label: "Most joined" },
  { id: "OPEN_ASC", label: "Fewest open" },
];

function formatFileSize(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseUploadResponse(value: string) {
  try {
    return value ? (JSON.parse(value) as { error?: string; url?: string }) : {};
  } catch {
    return {};
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("We could not compress that image."));
        }
      },
      type,
      quality,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("We could not read that image file."));
    };
    image.src = url;
  });
}

async function compressImageToWebp(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Upload a JPG, PNG, or WebP image.");
  }

  const image = await loadImage(file);
  let width = Math.min(image.naturalWidth, MAX_EVENT_IMAGE_WIDTH);
  let height = Math.round((image.naturalHeight / image.naturalWidth) * width);

  for (let pass = 0; pass < 5; pass += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare that image.");
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46]) {
      const blob = await canvasToBlob(canvas, "image/webp", quality);

      if (blob.size <= MAX_EVENT_IMAGE_BYTES) {
        return new File([blob], "event-image.webp", { type: "image/webp" });
      }
    }

    width = Math.round(width * 0.82);
    height = Math.round(height * 0.82);
  }

  throw new Error("Please choose a smaller image. We could not compress it below 2 MB.");
}

function toDateTimeLocal(value: string) {
  return formatIndiaDateTimeLocal(value);
}

function seatsLabel(experience: ExperienceView) {
  if (!experience.seatsTotal) return `${experience.confirmedCount} confirmed`;
  return `${experience.confirmedCount}/${experience.seatsTotal} confirmed · ${experience.remainingSeats ?? 0} open`;
}

function joinedCount(experience: ExperienceView) {
  return experience.confirmedCount + experience.requestedCount;
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPastEvent(experience: ExperienceView, now: Date) {
  return new Date(experience.dateTime).getTime() < now.getTime();
}

function isLiveToMembers(experience: ExperienceView, now: Date) {
  return experience.status === "PUBLISHED" && !isPastEvent(experience, now);
}

function isNeedsReview(experience: ExperienceView) {
  return experience.requestedCount > 0 || experience.cancellationRequestCount > 0;
}

function eventTimingLabel(experience: ExperienceView, now: Date) {
  const eventDate = new Date(experience.dateTime);

  if (isNeedsReview(experience)) return "Needs review";
  if (isLiveToMembers(experience, now)) {
    return sameLocalDay(eventDate, now) ? "Live today" : "Live to members";
  }
  if (isPastEvent(experience, now)) return "Past event";
  if (experience.status === "DRAFT") return "Upcoming draft";
  if (experience.status === "POSTPONED") return "Postponed";
  if (experience.status === "CANCELLED") return "Cancelled";
  if (experience.status === "ARCHIVED") return "Archived";
  return "Scheduled";
}

function eventPriorityRank(experience: ExperienceView, now: Date) {
  if (experience.cancellationRequestCount > 0) return 0;
  if (experience.requestedCount > 0) return 1;
  if (isLiveToMembers(experience, now)) return 2;
  if (experience.status === "DRAFT" && !isPastEvent(experience, now)) return 3;
  if (experience.status === "POSTPONED") return 4;
  if (experience.status === "CANCELLED") return 5;
  if (isPastEvent(experience, now)) return 6;
  return 7;
}

function matchesEventFilter(
  experience: ExperienceView,
  filter: EventFilter,
  now: Date,
) {
  if (filter === "ALL") return true;
  if (filter === "LIVE") return isLiveToMembers(experience, now);
  if (filter === "NEEDS_REVIEW") return isNeedsReview(experience);
  if (filter === "DRAFT") return experience.status === "DRAFT";
  if (filter === "PAST") {
    return (
      isPastEvent(experience, now) ||
      experience.status === "ARCHIVED" ||
      experience.status === "CANCELLED"
    );
  }
  return (
    isNeedsReview(experience) ||
    isLiveToMembers(experience, now) ||
    (experience.status === "DRAFT" && !isPastEvent(experience, now))
  );
}

function sortEvents(events: ExperienceView[], sort: EventSort, now: Date) {
  return [...events].sort((left, right) => {
    const leftTime = new Date(left.dateTime).getTime();
    const rightTime = new Date(right.dateTime).getTime();

    if (sort === "DATE_ASC") return leftTime - rightTime;
    if (sort === "DATE_DESC") return rightTime - leftTime;
    if (sort === "JOINED_DESC") {
      return joinedCount(right) - joinedCount(left) || leftTime - rightTime;
    }
    if (sort === "OPEN_ASC") {
      const leftOpen = left.remainingSeats ?? Number.POSITIVE_INFINITY;
      const rightOpen = right.remainingSeats ?? Number.POSITIVE_INFINITY;

      return leftOpen - rightOpen || leftTime - rightTime;
    }

    return (
      eventPriorityRank(left, now) - eventPriorityRank(right, now) ||
      leftTime - rightTime
    );
  });
}

function prettyStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deliveryProviderSuffix(delivery?: SetupEmailDeliveryView) {
  if (!delivery || delivery.status !== "sent") return "";
  if (delivery.provider === "resend") return " via Resend";
  if (delivery.provider === "smtp") return " via SMTP";
  return "";
}

function lowerFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function setupEmailToast(
  delivery: SetupEmailDeliveryView | undefined,
  messages: {
    sent: string;
    skipped: string;
    failedPrefix: string;
  },
): Exclude<Toast, null> {
  if (!delivery || delivery.status === "sent") {
    return {
      tone: "success",
      message: `${messages.sent}${deliveryProviderSuffix(delivery)}.`,
    };
  }

  if (delivery.status === "not_needed") {
    return {
      tone: "success",
      message: delivery.message ?? `${messages.sent}.`,
    };
  }

  if (delivery.status === "skipped") {
    return {
      tone: "error",
      message: delivery.message ?? messages.skipped,
    };
  }

  return {
    tone: "error",
    message: `${messages.failedPrefix} ${lowerFirst(
      delivery.message ?? "setup email could not be sent.",
    )}`,
  };
}

function compactDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fieldValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function experiencePayloadFromForm(
  form: HTMLFormElement,
  includeArchived: boolean,
): ExperiencePayload {
  const formData = new FormData(form);
  const seatsValue = fieldValue(formData, "seatsTotal");

  return {
    title: fieldValue(formData, "title"),
    slug: fieldValue(formData, "slug"),
    description: fieldValue(formData, "description"),
    location: fieldValue(formData, "location"),
    dateTime: fieldValue(formData, "dateTime"),
    imageUrl: fieldValue(formData, "imageUrl"),
    hostedByLabel: fieldValue(formData, "hostedByLabel"),
    hostName: fieldValue(formData, "hostName"),
    hostTitle: fieldValue(formData, "hostTitle"),
    hostBio: fieldValue(formData, "hostBio"),
    seatsTotal: seatsValue ? Number(seatsValue) : null,
    isVisible: formData.get("isVisible") === "on",
    isInviteOnly: formData.get("isInviteOnly") === "on",
    isArchived: includeArchived ? formData.get("isArchived") === "on" : false,
    status: fieldValue(formData, "status") || "DRAFT",
    visibilityType: fieldValue(formData, "visibilityType") || "ALL_MEMBERS",
    attendeeVisibilityEnabled: formData.get("attendeeVisibilityEnabled") === "on",
    selectedMemberIds: formData.getAll("selectedMemberIds").map(String),
  };
}

function hydrateExperience(
  current: ExperienceView,
  next: ExperienceApiView,
): ExperienceView {
  const seatsTotal = next.seatsTotal ?? null;
  const confirmedCount = next.confirmedCount ?? current.confirmedCount;

  return {
    ...current,
    ...next,
    seatsTotal,
    confirmedCount,
    requestedCount: next.requestedCount ?? current.requestedCount,
    reservationCount: next.reservationCount ?? current.reservationCount,
    waitlistedCount: next.waitlistedCount ?? current.waitlistedCount,
    cancellationRequestCount:
      next.cancellationRequestCount ?? current.cancellationRequestCount,
    selectedMemberIds: next.selectedMemberIds ?? current.selectedMemberIds,
    attendees: next.attendees ?? current.attendees,
    remainingSeats:
      seatsTotal === null ? null : Math.max(seatsTotal - confirmedCount, 0),
  };
}

function withRecountedAttendees(
  experience: ExperienceView,
  attendees: ExperienceAttendeeView[],
) {
  const confirmedCount = attendees.filter(
    (attendee) => attendee.status === "CONFIRMED",
  ).length;
  const requestedCount = attendees.filter(
    (attendee) => attendee.status === "REQUESTED",
  ).length;
  const waitlistedCount = attendees.filter(
    (attendee) => attendee.status === "WAITLISTED",
  ).length;
  const cancellationRequestCount = attendees.filter(
    (attendee) => attendee.status === "CANCELLATION_REQUESTED",
  ).length;

  return {
    ...experience,
    attendees,
    confirmedCount,
    requestedCount,
    waitlistedCount,
    cancellationRequestCount,
    reservationCount: attendees.length,
    remainingSeats:
      experience.seatsTotal == null
        ? null
        : Math.max(experience.seatsTotal - confirmedCount, 0),
  };
}

function EventImageField({ defaultValue = "" }: ImageUploadFieldProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue);
  const [status, setStatus] = useState<ImageUploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const form = input.form ?? input.closest("form");

    if (!file) return;

    setStatus("compressing");
    setMessage("Compressing image to 2 MB or less.");
    setOriginalSize(file.size);
    setCompressedSize(null);

    try {
      const compressedFile = await compressImageToWebp(file);
      setCompressedSize(compressedFile.size);
      setStatus("uploading");
      setMessage("Uploading compressed image.");

      const slugInput = form?.elements.namedItem("slug");
      const slug =
        slugInput instanceof HTMLInputElement ? slugInput.value : "event";
      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("slug", slug);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      const responseText = await response.text();
      const payload = parseUploadResponse(responseText);

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error ||
            responseText ||
            `Upload failed with status ${response.status}.`,
        );
      }

      setImageUrl(payload.url);
      setStatus("uploaded");
      setMessage("Image uploaded and ready for this event.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not prepare that image.",
      );
    } finally {
      input.value = "";
    }
  }

  return (
    <div className="field full-field image-upload-field">
      <span>Event image</span>
      <div className="image-upload-shell">
        {imageUrl ? (
          <div className="image-upload-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Selected event" />
          </div>
        ) : (
          <div className="image-upload-empty">No image selected</div>
        )}
        <div className="image-upload-controls">
          <label className="small-button bronze image-upload-button">
            Upload Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={uploadImage}
            />
          </label>
          <label className="field image-url-field">
            <span>Image URL</span>
            <input
              name="imageUrl"
              className="input"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setStatus("idle");
                setMessage("");
              }}
              placeholder="Upload an image or paste an image URL"
              required
            />
          </label>
          <div className={`image-upload-status status-${status}`}>
            {originalSize ? <span>Original {formatFileSize(originalSize)}</span> : null}
            {compressedSize ? (
              <span>Compressed {formatFileSize(compressedSize)}</span>
            ) : null}
            {message ? <span>{message}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminConsole({
  requests,
  experiences,
  reservations,
  referrals,
  members,
  emailLogs,
  feedbackThreads,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [requestState, setRequestState] = useState(requests);
  const [experienceState, setExperienceState] = useState(experiences);
  const [reservationState, setReservationState] = useState(reservations);
  const [feedbackState, setFeedbackState] = useState(feedbackThreads);
  const [memberState, setMemberState] = useState(members);
  const [requestFilter, setRequestFilter] = useState("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<EventFilter>("ACTIVE");
  const [eventSort, setEventSort] = useState<EventSort>("PRIORITY");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [deleteMemberTargetId, setDeleteMemberTargetId] = useState<string | null>(null);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [isCreatingExperience, setIsCreatingExperience] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [guestEventId, setGuestEventId] = useState<string | null>(null);
  const [detailsEventId, setDetailsEventId] = useState<string | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    id: string;
    action: "publish" | "unpublish" | "postpone" | "cancel" | "archive";
  } | null>(null);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const selectedRequest = requestState.find(
    (request) => request.id === selectedRequestId,
  );
  const editingMember = memberState.find((member) => member.id === editingMemberId);
  const deleteMemberTarget = memberState.find(
    (member) => member.id === deleteMemberTargetId,
  );
  const editingExperience = experienceState.find(
    (experience) => experience.id === editingExperienceId,
  );
  const deleteTarget = experienceState.find(
    (experience) => experience.id === deleteTargetId,
  );
  const guestEvent = experienceState.find(
    (experience) => experience.id === guestEventId,
  );
  const detailsEvent = experienceState.find(
    (experience) => experience.id === detailsEventId,
  );
  const lifecycleExperience = experienceState.find(
    (experience) => experience.id === lifecycleTarget?.id,
  );
  const selectedFeedback = feedbackState.find(
    (thread) => thread.id === selectedFeedbackId,
  );

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return requestState.filter((request) => {
      const statusMatch =
        requestFilter === "ALL" || request.status === requestFilter;
      const searchMatch =
        !q ||
        request.fullName.toLowerCase().includes(q) ||
        request.email.toLowerCase().includes(q) ||
        request.phone.toLowerCase().includes(q);
      return statusMatch && searchMatch;
    });
  }, [requestFilter, requestSearch, requestState]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return memberState.filter(
      (member) =>
        !q ||
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q),
    );
  }, [memberSearch, memberState]);

  const eventNow = useMemo(() => new Date(), []);

  const filteredEvents = useMemo(() => {
    const matchingEvents = experienceState.filter((experience) =>
      matchesEventFilter(experience, eventFilter, eventNow),
    );

    return sortEvents(matchingEvents, eventSort, eventNow);
  }, [eventFilter, eventNow, eventSort, experienceState]);

  const eventFilterOptions: Array<{ id: EventFilter; label: string; count: number }> = [
    {
      id: "ACTIVE",
      label: "Active",
      count: experienceState.filter((experience) =>
        matchesEventFilter(experience, "ACTIVE", eventNow),
      ).length,
    },
    {
      id: "LIVE",
      label: "Live",
      count: experienceState.filter((experience) =>
        matchesEventFilter(experience, "LIVE", eventNow),
      ).length,
    },
    {
      id: "NEEDS_REVIEW",
      label: "Needs Review",
      count: experienceState.filter((experience) => isNeedsReview(experience))
        .length,
    },
    {
      id: "DRAFT",
      label: "Drafts",
      count: experienceState.filter((experience) => experience.status === "DRAFT")
        .length,
    },
    {
      id: "PAST",
      label: "Past",
      count: experienceState.filter((experience) =>
        matchesEventFilter(experience, "PAST", eventNow),
      ).length,
    },
    { id: "ALL", label: "All", count: experienceState.length },
  ];

  const eventDashboardCards = [
    {
      label: "Live to members",
      value: experienceState.filter((experience) =>
        isLiveToMembers(experience, eventNow),
      ).length,
    },
    {
      label: "Joined",
      value: experienceState.reduce(
        (total, experience) => total + joinedCount(experience),
        0,
      ),
    },
    {
      label: "Pending review",
      value: experienceState.reduce(
        (total, experience) => total + experience.requestedCount,
        0,
      ),
    },
    {
      label: "Cancellations",
      value: experienceState.reduce(
        (total, experience) => total + experience.cancellationRequestCount,
        0,
      ),
    },
  ];

  const dashboardCards = [
    {
      label: "Pending requests",
      value: requestState.filter((request) => request.status === "PENDING").length,
    },
    {
      label: "Approved members",
      value: memberState.filter((member) => member.accessStatus === "APPROVED").length,
    },
    {
      label: "Live events",
      value: experienceState.filter(
        (experience) => experience.status === "PUBLISHED",
      ).length,
    },
    {
      label: "Reservation requests",
      value: reservationState.filter(
        (reservation) => reservation.status === "REQUESTED",
      ).length,
    },
    {
      label: "Cancellation requests",
      value: reservationState.filter(
        (reservation) => reservation.status === "CANCELLATION_REQUESTED",
      ).length,
    },
    {
      label: "Waitlist",
      value: requestState.filter((request) => request.status === "WAITLISTED")
        .length,
    },
    { label: "Referrals", value: referrals.length },
    {
      label: "Failed emails",
      value: emailLogs.filter((email) => email.status === "FAILED").length,
    },
  ];

  function showToast(tone: "success" | "error", message: string) {
    setToast({ tone, message });
  }

  function openRequest(request: AccessRequestView) {
    setSelectedRequestId(request.id);
    setRequestNote(request.adminNote ?? "");
  }

  function isLoading(key: string) {
    return loadingKey === key;
  }

  async function runJson<T>(
    key: string,
    url: string,
    init: RequestInit,
    fallbackError: string,
  ) {
    setLoadingKey(key);
    setToast(null);

    try {
      const response = await fetch(url, init);
      const responseText = await response.text();
      let payload = {} as { error?: string } & T;

      try {
        payload = responseText
          ? (JSON.parse(responseText) as { error?: string } & T)
          : payload;
      } catch {
        payload = {
          error: responseText,
        } as { error?: string } & T;
      }

      if (!response.ok) {
        throw new Error(
          payload.error ||
            `${fallbackError} Server returned status ${response.status}.`,
        );
      }

      return payload as T;
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : fallbackError,
      );
      return null;
    } finally {
      setLoadingKey(null);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    window.location.href = "/login";
  }

  async function reviewRequest(id: string, action: AccessAction) {
    const key = `request:${id}:${action}`;
    const payload = await runJson<{
      status: string;
      member?: MemberView | null;
      setupEmailDelivery?: SetupEmailDeliveryView;
    }>(
      key,
      `/api/admin/access-requests/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote: requestNote }),
      },
      "Could not update access request.",
    );

    if (!payload) return;

    setRequestState((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status: payload.status,
              adminNote: requestNote || request.adminNote,
              reviewedAt:
                action === "resend_setup"
                  ? request.reviewedAt
                  : new Date().toISOString(),
            }
          : request,
      ),
    );

    const reviewedMember = payload.member;
    if (reviewedMember) {
      setMemberState((current) => {
        const exists = current.some((member) => member.id === reviewedMember.id);

        if (exists) {
          return current.map((member) =>
            member.id === reviewedMember.id ? reviewedMember : member,
          );
        }

        return [reviewedMember, ...current];
      });
    }

    if (action === "resend_setup") {
      const nextToast = setupEmailToast(payload.setupEmailDelivery, {
        sent: "Password setup email resent",
        skipped:
          "Setup email was skipped because no email provider is configured.",
        failedPrefix: "Setup email was not resent because",
      });
      showToast(nextToast.tone, nextToast.message);
      return;
    }

    if (payload.status === "APPROVED") {
      const nextToast = setupEmailToast(payload.setupEmailDelivery, {
        sent: "Access approved and setup email sent",
        skipped:
          "Access approved, but setup email was skipped because no email provider is configured.",
        failedPrefix: "Access approved, but",
      });
      showToast(nextToast.tone, nextToast.message);
      return;
    }

    showToast(
      "success",
      `Access request ${prettyStatus(payload.status).toLowerCase()}.`,
    );
  }

  async function saveMember(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: fieldValue(formData, "fullName"),
      email: fieldValue(formData, "email"),
      role: fieldValue(formData, "role"),
      accessStatus: fieldValue(formData, "accessStatus"),
    };
    const body = await runJson<{ member: MemberView }>(
      `member:${id}:save`,
      `/api/admin/members/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Could not update member.",
    );

    if (!body) return;

    setMemberState((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              fullName: body.member.fullName,
              email: body.member.email,
              role: body.member.role,
              accessStatus: body.member.accessStatus,
              suspendedAt: body.member.suspendedAt,
            }
          : member,
      ),
    );
    setEditingMemberId(null);
    showToast("success", "Member details saved.");
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      fullName: fieldValue(formData, "fullName"),
      email: fieldValue(formData, "email"),
      role: fieldValue(formData, "role"),
    };
    const body = await runJson<{
      member: MemberView;
      setupEmailDelivery?: SetupEmailDeliveryView;
    }>(
      "member:add",
      "/api/admin/members",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Could not add member.",
    );

    if (!body) return;

    setMemberState((current) => {
      const exists = current.some((member) => member.id === body.member.id);

      if (exists) {
        return current.map((member) =>
          member.id === body.member.id ? body.member : member,
        );
      }

      return [body.member, ...current];
    });
    setRequestState((current) =>
      current.map((request) =>
        request.email.toLowerCase() === body.member.email.toLowerCase()
          ? {
              ...request,
              status: "APPROVED",
              adminNote: request.adminNote ?? "Added directly by admin.",
              reviewedAt: request.reviewedAt ?? new Date().toISOString(),
            }
          : request,
      ),
    );
    form.reset();
    setIsAddingMember(false);
    const nextToast = setupEmailToast(body.setupEmailDelivery, {
      sent: "Member added and setup email sent",
      skipped:
        "Member added, but setup email was skipped because no email provider is configured.",
      failedPrefix: "Member added, but",
    });
    showToast(nextToast.tone, nextToast.message);
  }

  async function deleteMember(id: string) {
    const payload = await runJson<{ ok: boolean }>(
      `member:${id}:delete`,
      `/api/admin/members/${id}`,
      { method: "DELETE" },
      "Could not delete member.",
    );

    if (!payload) return;

    setMemberState((current) => current.filter((member) => member.id !== id));
    setDeleteMemberTargetId(null);
    showToast("success", "Member deleted.");
  }

  async function patchExperience(
    id: string,
    data: Partial<ExperiencePayload>,
    successMessage: string,
    keySuffix = "update",
  ) {
    const payload = await runJson<{ experience: ExperienceApiView }>(
      `experience:${id}:${keySuffix}`,
      `/api/admin/experiences/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
      "Could not update event.",
    );

    if (!payload) return false;

    setExperienceState((current) =>
      current.map((experience) =>
        experience.id === id
          ? {
              ...hydrateExperience(experience, payload.experience),
              selectedMemberIds:
                data.selectedMemberIds ?? payload.experience.selectedMemberIds ?? experience.selectedMemberIds,
            }
          : experience,
      ),
    );
    showToast("success", successMessage);
    return true;
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const payload = experiencePayloadFromForm(event.currentTarget, true);
    const updated = await patchExperience(
      id,
      payload,
      "Event details saved.",
      "save",
    );

    if (updated) {
      setEditingExperienceId(null);
    }
  }

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = experiencePayloadFromForm(form, false);
    const body = await runJson<{ experience: ExperienceApiView }>(
      "experience:create",
      "/api/admin/experiences",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Could not create event.",
    );

    if (!body) return;

    const seatsTotal = body.experience.seatsTotal ?? null;
    setExperienceState((current) => [
      ...current,
      {
        ...body.experience,
        seatsTotal,
        confirmedCount: 0,
        requestedCount: 0,
        waitlistedCount: 0,
        cancellationRequestCount: 0,
        reservationCount: 0,
        remainingSeats: seatsTotal,
        selectedMemberIds: body.experience.selectedMemberIds ?? [],
        attendees: body.experience.attendees ?? [],
      },
    ]);
    form.reset();
    setIsCreatingExperience(false);
    showToast("success", "Event created.");
  }

  async function deleteExperience(id: string) {
    const payload = await runJson<{ ok: boolean }>(
      `experience:${id}:delete`,
      `/api/admin/experiences/${id}`,
      { method: "DELETE" },
      "Could not delete event.",
    );

    if (!payload) return;

    setExperienceState((current) =>
      current.filter((experience) => experience.id !== id),
    );
    setDeleteTargetId(null);
    showToast("success", "Event permanently deleted.");
  }

  async function runLifecycleAction(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!lifecycleTarget || !lifecycleExperience) return;

    const formData = event?.currentTarget ? new FormData(event.currentTarget) : null;
    const action = lifecycleTarget.action;
    const payload = await runJson<{ experience: ExperienceApiView }>(
      `experience:${lifecycleTarget.id}:${action}`,
      `/api/admin/experiences/${lifecycleTarget.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          postponementMessage: String(formData?.get("postponementMessage") ?? ""),
          cancellationReason: String(formData?.get("cancellationReason") ?? ""),
        }),
      },
      "Could not update event status.",
    );

    if (!payload) return;

    setExperienceState((current) =>
      current.map((experience) =>
        experience.id === lifecycleTarget.id
          ? hydrateExperience(experience, payload.experience)
          : experience,
      ),
    );
    setLifecycleTarget(null);
    showToast("success", `Event ${prettyStatus(payload.experience.status).toLowerCase()}.`);
  }

  async function sendEventDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsEvent) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = await runJson<EventDetailsDeliveryView>(
      `experience:${detailsEvent.id}:details`,
      `/api/admin/experiences/${detailsEvent.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: fieldValue(formData, "subject"),
          recipientStatuses: formData.getAll("recipientStatuses").map(String),
          meetingPoint: fieldValue(formData, "meetingPoint"),
          arrivalWindow: fieldValue(formData, "arrivalWindow"),
          locationDetails: fieldValue(formData, "locationDetails"),
          dressCode: fieldValue(formData, "dressCode"),
          whatToBring: fieldValue(formData, "whatToBring"),
          contact: fieldValue(formData, "contact"),
          note: fieldValue(formData, "note"),
        }),
      },
      "Could not send event details.",
    );

    if (!body) return;

    setDetailsEventId(null);

    if (body.failedCount > 0) {
      showToast(
        "error",
        `Details sent to ${body.sentCount}, skipped ${body.skippedCount}, failed ${body.failedCount}.`,
      );
      return;
    }

    if (body.skippedCount > 0) {
      showToast(
        "error",
        `Details prepared for ${body.recipientCount}, but ${body.skippedCount} email${body.skippedCount === 1 ? " was" : "s were"} skipped because no provider is configured.`,
      );
      return;
    }

    showToast("success", `Event details emailed to ${body.sentCount} member${body.sentCount === 1 ? "" : "s"}.`);
  }

  async function updateReservation(
    id: string,
    status: "CONFIRMED" | "WAITLISTED" | "CANCELLED",
  ) {
    const payload = await runJson<{ reservation: { status: string } }>(
      `reservation:${id}:${status}`,
      `/api/admin/reservations/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
      "Could not update reservation.",
    );

    if (!payload) return;

    setReservationState((current) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: payload.reservation.status }
          : reservation,
      ),
    );
    setExperienceState((current) =>
      current.map((experience) => {
        if (!experience.attendees.some((attendee) => attendee.id === id)) {
          return experience;
        }

        return withRecountedAttendees(
          experience,
          experience.attendees.map((attendee) =>
            attendee.id === id
              ? { ...attendee, status: payload.reservation.status }
              : attendee,
          ),
        );
      }),
    );
    showToast("success", "Reservation updated and email sent.");
  }

  async function reviewCancellation(
    id: string,
    action: "approve_cancellation" | "decline_cancellation",
    adminReply = "",
  ) {
    const payload = await runJson<{ reservation: { status: string } }>(
      `reservation:${id}:${action}`,
      `/api/admin/reservations/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminReply }),
      },
      "Could not review cancellation.",
    );

    if (!payload) return;

    setReservationState((current) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: payload.reservation.status }
          : reservation,
      ),
    );
    setExperienceState((current) =>
      current.map((experience) => {
        if (!experience.attendees.some((attendee) => attendee.id === id)) {
          return experience;
        }

        return withRecountedAttendees(
          experience,
          experience.attendees.map((attendee) =>
            attendee.id === id
              ? { ...attendee, status: payload.reservation.status }
              : attendee,
          ),
        );
      }),
    );
    showToast("success", "Cancellation review sent.");
  }

  async function updateFeedback(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = await runJson<{ thread: FeedbackThreadView }>(
      `feedback:${id}:update`,
      `/api/admin/feedback/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: fieldValue(formData, "status"),
          reply: fieldValue(formData, "reply"),
        }),
      },
      "Could not update feedback.",
    );

    if (!payload) return;

    setFeedbackState((current) =>
      current.map((thread) => (thread.id === id ? payload.thread : thread)),
    );
    setSelectedFeedbackId(null);
    showToast("success", "Feedback updated.");
  }

  return (
    <div className="dashboard-section admin-dashboard">
      <div className="wrap admin-shell">
        <aside className="admin-sidebar">
          <div>
            <p className="eyebrow on-dark">Admin</p>
            <h1 className="section-title">
              Operating <em>dashboard.</em>
            </h1>
            <p className="hero-copy">
              Review access, manage events, and keep private correspondence moving
              without endless scrolling.
            </p>
          </div>
          <nav className="admin-tabs" aria-label="Admin sections">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-actions">
            <Link className="small-button secondary on-dark-action" href="/">
              View Site
            </Link>
            <button
              className="small-button secondary on-dark-action"
              type="button"
              onClick={signOut}
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="admin-main">
          {toast ? (
            <div className={`toast toast--${toast.tone}`} role="status">
              <span>{toast.message}</span>
              <button type="button" onClick={() => setToast(null)}>
                Close
              </button>
            </div>
          ) : null}

          {activeTab === "dashboard" ? (
            <section className="admin-panel" aria-labelledby="admin-dashboard-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Dashboard</p>
                  <h2 id="admin-dashboard-title" className="panel-title">
                    Today at a glance
                  </h2>
                </div>
              </div>
              <div className="metric-grid">
                {dashboardCards.map((card) => (
                  <article className="metric-card" key={card.label}>
                    <p className="microcopy">{card.label}</p>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "requests" ? (
            <section className="admin-panel" aria-labelledby="admin-requests-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Access Requests</p>
                  <h2 id="admin-requests-title" className="panel-title">
                    Review applications
                  </h2>
                </div>
                <span className="status-pill">{filteredRequests.length}</span>
              </div>
              <div className="admin-toolbar">
                <label className="field compact-field">
                  <span>Search</span>
                  <input
                    className="input"
                    value={requestSearch}
                    onChange={(event) => setRequestSearch(event.target.value)}
                    placeholder="Name, email, or phone"
                  />
                </label>
                <label className="field compact-field">
                  <span>Status</span>
                  <select
                    className="input"
                    value={requestFilter}
                    onChange={(event) => setRequestFilter(event.target.value)}
                  >
                    {["ALL", "PENDING", "APPROVED", "WAITLISTED", "DECLINED"].map(
                      (status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="admin-list">
                {filteredRequests.length ? (
                  filteredRequests.map((request) => (
                    <button
                      className="admin-list-row"
                      key={request.id}
                      type="button"
                      onClick={() => openRequest(request)}
                    >
                      <span className="admin-row-main">
                        <strong>{request.fullName}</strong>
                        <span>{request.email}</span>
                      </span>
                      <span className="admin-row-meta">
                        <span className={`status-pill status-${request.status.toLowerCase()}`}>
                          {prettyStatus(request.status)}
                        </span>
                        <span>{compactDate(request.createdAt)}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="section-copy">No access requests match this view.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "members" ? (
            <section className="admin-panel" aria-labelledby="admin-members-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Members</p>
                  <h2 id="admin-members-title" className="panel-title">
                    Access holders
                  </h2>
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="small-button bronze"
                    onClick={() => setIsAddingMember(true)}
                  >
                    Add Member
                  </button>
                  <span className="status-pill">{filteredMembers.length}</span>
                </div>
              </div>
              <label className="field compact-field">
                <span>Search members</span>
                <input
                  className="input"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Name or email"
                />
              </label>
              <div className="admin-list">
                {filteredMembers.map((member) => (
                  <article className="admin-list-row is-static" key={member.id}>
                    <span className="admin-row-main">
                      <strong>{member.fullName}</strong>
                      <span>{member.email}</span>
                    </span>
                    <span className="admin-row-meta">
                      <span className={`status-pill status-${member.accessStatus.toLowerCase()}`}>
                        {prettyStatus(member.accessStatus)}
                      </span>
                      <span>{member.role}</span>
                      <span>{member.passwordSetAt ? "Password set" : "Setup pending"}</span>
                    </span>
                    <span className="admin-actions">
                      <button
                        type="button"
                        className="small-button secondary"
                        onClick={() => setEditingMemberId(member.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="small-button danger"
                        onClick={() => setDeleteMemberTargetId(member.id)}
                      >
                        Delete
                      </button>
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "events" ? (
            <section className="admin-panel" aria-labelledby="admin-events-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Events</p>
                  <h2 id="admin-events-title" className="panel-title">
                    Monitor calendar
                  </h2>
                </div>
                <button
                  type="button"
                  className="small-button bronze"
                  onClick={() => setIsCreatingExperience(true)}
                >
                  New Event
                </button>
              </div>
              <div className="metric-grid event-metric-grid">
                {eventDashboardCards.map((card) => (
                  <article className="metric-card" key={card.label}>
                    <p className="microcopy">{card.label}</p>
                    <strong>{card.value}</strong>
                  </article>
                ))}
              </div>
              <div className="event-command-bar" aria-label="Event controls">
                <div className="event-filter-tabs" role="tablist" aria-label="Event status filters">
                  {eventFilterOptions.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={`event-filter-tab ${eventFilter === filter.id ? "is-active" : ""}`}
                      onClick={() => setEventFilter(filter.id)}
                    >
                      <span>{filter.label}</span>
                      <strong>{filter.count}</strong>
                    </button>
                  ))}
                </div>
                <label className="field compact-field event-sort-field">
                  <span>Sort</span>
                  <select
                    className="input"
                    value={eventSort}
                    onChange={(event) => setEventSort(event.target.value as EventSort)}
                  >
                    {eventSortOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-list event-list">
                {filteredEvents.length ? (
                  filteredEvents.map((experience) => (
                    <article className="admin-list-row is-static event-row" key={experience.id}>
                      <span className="admin-row-main">
                        <span className="event-row__kicker">
                          <span
                            className={`status-pill status-${isNeedsReview(experience) ? "pending" : experience.status.toLowerCase()}`}
                          >
                            {eventTimingLabel(experience, eventNow)}
                          </span>
                          <span className={`status-pill status-${experience.status.toLowerCase()}`}>
                            {prettyStatus(experience.status)}
                          </span>
                        </span>
                        <strong>{experience.title}</strong>
                        <span>
                          {formatExperienceDate(experience.dateTime)} · {experience.location}
                        </span>
                      </span>
                      <span className="admin-row-meta event-row__meta">
                        <span className="status-pill">
                          {experience.visibilityType === "ALL_MEMBERS"
                            ? "All Members"
                            : experience.visibilityType === "SELECTED_MEMBERS"
                              ? "Selected Members"
                              : "Invite Only"}
                        </span>
                        <span>{seatsLabel(experience)}</span>
                        {experience.announcementSentAt ? (
                          <span>Announcement sent {compactDate(experience.announcementSentAt)}</span>
                        ) : (
                          <span>Announcement not sent</span>
                        )}
                      </span>
                      <div className="event-monitor-grid" aria-label={`${experience.title} registration snapshot`}>
                        <span className="event-monitor-item">
                          <small>Joined</small>
                          <strong>{experience.confirmedCount}</strong>
                          <em>{experience.requestedCount} pending</em>
                        </span>
                        <span className="event-monitor-item">
                          <small>Open</small>
                          <strong>{experience.remainingSeats ?? "No cap"}</strong>
                          <em>{experience.seatsTotal ? `${experience.seatsTotal} seats` : "No cap"}</em>
                        </span>
                        <span className="event-monitor-item">
                          <small>Waitlist</small>
                          <strong>{experience.waitlistedCount}</strong>
                          <em>{experience.cancellationRequestCount} cancellations</em>
                        </span>
                      </div>
                      <span className="admin-actions event-row__actions">
                        <button
                          type="button"
                          className="small-button secondary"
                          onClick={() => setEditingExperienceId(experience.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="small-button secondary"
                          onClick={() => setGuestEventId(experience.id)}
                        >
                          View Guests
                        </button>
                        <button
                          type="button"
                          className="small-button bronze"
                          onClick={() => setDetailsEventId(experience.id)}
                        >
                          Send Details
                        </button>
                        <button
                          type="button"
                          className="small-button bronze"
                          onClick={() =>
                            setLifecycleTarget({
                              id: experience.id,
                              action:
                                experience.status === "PUBLISHED"
                                  ? "unpublish"
                                  : "publish",
                            })
                          }
                        >
                          {experience.status === "PUBLISHED"
                            ? "Unpublish"
                            : "Publish & Notify"}
                        </button>
                        <button
                          type="button"
                          className="small-button secondary"
                          onClick={() =>
                            setLifecycleTarget({ id: experience.id, action: "postpone" })
                          }
                        >
                          Postpone
                        </button>
                        <button
                          type="button"
                          className="small-button secondary"
                          onClick={() =>
                            setLifecycleTarget({ id: experience.id, action: "cancel" })
                          }
                        >
                          Cancel Event
                        </button>
                        <button
                          type="button"
                          className="small-button secondary"
                          onClick={() =>
                            setLifecycleTarget({ id: experience.id, action: "archive" })
                          }
                        >
                          Archive
                        </button>
                        <button
                          type="button"
                          className="small-button danger"
                          onClick={() => setDeleteTargetId(experience.id)}
                        >
                          Delete
                        </button>
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="section-copy">No events match this view.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "reservations" ? (
            <section className="admin-panel" aria-labelledby="admin-reservations-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Reservations</p>
                  <h2 id="admin-reservations-title" className="panel-title">
                    Reservation review
                  </h2>
                </div>
                <span className="status-pill">
                  {
                    reservationState.filter(
                      (item) => item.status === "CANCELLATION_REQUESTED",
                    ).length
                  }{" "}
                  cancellation requests
                </span>
              </div>
              <div className="admin-list">
                {reservationState.length ? (
                  reservationState.map((reservation) => (
                    <article className="admin-list-row is-static" key={reservation.id}>
                      <span className="admin-row-main">
                        <strong>{reservation.experienceTitle}</strong>
                        <span>
                          {reservation.memberName} · {reservation.memberEmail}
                        </span>
                      </span>
                      <span className="admin-row-meta">
                        <span className={`status-pill status-${reservation.status.toLowerCase()}`}>
                          {prettyStatus(reservation.status)}
                        </span>
                        {reservation.cancellationReason ? (
                          <span>{reservation.cancellationReason}</span>
                        ) : null}
                        <span>{compactDate(reservation.createdAt)}</span>
                      </span>
                      <span className="admin-actions">
                        {reservation.status === "CANCELLATION_REQUESTED" ? (
                          <>
                            <button
                              type="button"
                              className="small-button bronze"
                              disabled={isLoading(`reservation:${reservation.id}:approve_cancellation`)}
                              onClick={() =>
                                reviewCancellation(
                                  reservation.id,
                                  "approve_cancellation",
                                )
                              }
                            >
                              Approve Cancellation
                            </button>
                            <button
                              type="button"
                              className="small-button secondary"
                              disabled={isLoading(`reservation:${reservation.id}:decline_cancellation`)}
                              onClick={() =>
                                reviewCancellation(
                                  reservation.id,
                                  "decline_cancellation",
                                )
                              }
                            >
                              Decline Cancellation
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="small-button bronze"
                              disabled={isLoading(`reservation:${reservation.id}:CONFIRMED`)}
                              onClick={() => updateReservation(reservation.id, "CONFIRMED")}
                            >
                              {isLoading(`reservation:${reservation.id}:CONFIRMED`)
                                ? "Confirming"
                                : "Confirm"}
                            </button>
                            <button
                              type="button"
                              className="small-button secondary"
                              disabled={isLoading(`reservation:${reservation.id}:WAITLISTED`)}
                              onClick={() => updateReservation(reservation.id, "WAITLISTED")}
                            >
                              {isLoading(`reservation:${reservation.id}:WAITLISTED`)
                                ? "Saving"
                                : "Waitlist"}
                            </button>
                            <button
                              type="button"
                              className="small-button secondary"
                              disabled={isLoading(`reservation:${reservation.id}:CANCELLED`)}
                              onClick={() => updateReservation(reservation.id, "CANCELLED")}
                            >
                              {isLoading(`reservation:${reservation.id}:CANCELLED`)
                                ? "Cancelling"
                                : "Cancel"}
                            </button>
                          </>
                        )}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="section-copy">No reservation requests yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "referrals" ? (
            <section className="admin-panel" aria-labelledby="admin-referrals-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Referrals</p>
                  <h2 id="admin-referrals-title" className="panel-title">
                    Member introductions
                  </h2>
                </div>
                <span className="status-pill">{referrals.length}</span>
              </div>
              <div className="admin-list">
                {referrals.length ? (
                  referrals.map((referral) => (
                    <article className="admin-list-row is-static" key={referral.id}>
                      <span className="admin-row-main">
                        <strong>{referral.referredName}</strong>
                        <span>{referral.referredEmail}</span>
                      </span>
                      <span className="admin-row-meta">
                        <span>{referral.relationship}</span>
                        <span>By {referral.referrerName}</span>
                        <span className={`status-pill status-${referral.status.toLowerCase()}`}>
                          {prettyStatus(referral.status)}
                        </span>
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="section-copy">No referrals yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "feedback" ? (
            <section className="admin-panel" aria-labelledby="admin-feedback-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Feedback</p>
                  <h2 id="admin-feedback-title" className="panel-title">
                    Member notes
                  </h2>
                </div>
                <span className="status-pill">{feedbackState.length}</span>
              </div>
              <div className="admin-list">
                {feedbackState.length ? (
                  feedbackState.map((thread) => (
                    <button
                      className="admin-list-row"
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedFeedbackId(thread.id)}
                    >
                      <span className="admin-row-main">
                        <strong>{thread.subject}</strong>
                        <span>
                          {thread.memberName} · {thread.memberEmail}
                        </span>
                      </span>
                      <span className="admin-row-meta">
                        <span className={`status-pill status-${thread.status.toLowerCase()}`}>
                          {prettyStatus(thread.status)}
                        </span>
                        <span>{thread.category.replace(/_/g, " ")}</span>
                        <span>{compactDate(thread.createdAt)}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="section-copy">No feedback yet.</p>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "emails" ? (
            <section className="admin-panel" aria-labelledby="admin-emails-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Emails</p>
                  <h2 id="admin-emails-title" className="panel-title">
                    Recent logs
                  </h2>
                </div>
                <span className="status-pill">{emailLogs.length}</span>
              </div>
              <div className="admin-list">
                {emailLogs.length ? (
                  emailLogs.map((email) => (
                    <article className="admin-list-row is-static" key={email.id}>
                      <span className="admin-row-main">
                        <strong>{email.templateKey}</strong>
                        <span>{email.toEmail}</span>
                      </span>
                      <span className="admin-row-meta">
                        <span className={`status-pill status-${email.status.toLowerCase()}`}>
                          {prettyStatus(email.status)}
                        </span>
                        <span>{new Date(email.createdAt).toLocaleString()}</span>
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="section-copy">No email logs yet.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {selectedRequest ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Access request details">
          <aside className="admin-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Access Request</p>
                <h2 className="panel-title">{selectedRequest.fullName}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setSelectedRequestId(null)}
              >
                Close
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>Email</strong><span>{selectedRequest.email}</span></p>
              <p><strong>Phone</strong><span>{selectedRequest.phone}</span></p>
              <p><strong>Status</strong><span>{prettyStatus(selectedRequest.status)}</span></p>
              <p><strong>Referred by</strong><span>{selectedRequest.referredBy || "-"}</span></p>
            </div>
            <div className="drawer-section">
              <h3>Message</h3>
              <p className="section-copy">{selectedRequest.message}</p>
            </div>
            <div className="drawer-section">
              <h3>Interests</h3>
              <p className="microcopy">{selectedRequest.interests.join(", ")}</p>
              <p className="microcopy">Preferred: {selectedRequest.preferredExperiences.join(", ")}</p>
            </div>
            <label className="field">
              <span>Admin notes</span>
              <textarea
                className="textarea"
                value={requestNote}
                onChange={(event) => setRequestNote(event.target.value)}
              />
            </label>
            <div className="drawer-actions">
              <button
                type="button"
                className="small-button bronze"
                disabled={isLoading(`request:${selectedRequest.id}:approve`)}
                onClick={() => reviewRequest(selectedRequest.id, "approve")}
              >
                {isLoading(`request:${selectedRequest.id}:approve`) ? "Approving" : "Approve"}
              </button>
              <button
                type="button"
                className="small-button secondary"
                disabled={isLoading(`request:${selectedRequest.id}:waitlist`)}
                onClick={() => reviewRequest(selectedRequest.id, "waitlist")}
              >
                {isLoading(`request:${selectedRequest.id}:waitlist`) ? "Saving" : "Waitlist"}
              </button>
              <button
                type="button"
                className="small-button secondary"
                disabled={isLoading(`request:${selectedRequest.id}:decline`)}
                onClick={() => reviewRequest(selectedRequest.id, "decline")}
              >
                {isLoading(`request:${selectedRequest.id}:decline`) ? "Declining" : "Decline"}
              </button>
              {selectedRequest.status === "APPROVED" ? (
                <button
                  type="button"
                  className="small-button secondary"
                  disabled={isLoading(`request:${selectedRequest.id}:resend_setup`)}
                  onClick={() => reviewRequest(selectedRequest.id, "resend_setup")}
                >
                  {isLoading(`request:${selectedRequest.id}:resend_setup`)
                    ? "Sending"
                    : "Resend setup email"}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {guestEvent ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Event guests">
          <aside className="admin-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Event Guests</p>
                <h2 className="panel-title">{guestEvent.title}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setGuestEventId(null)}
              >
                Close
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>Confirmed</strong><span>{guestEvent.confirmedCount}</span></p>
              <p><strong>Pending</strong><span>{guestEvent.requestedCount}</span></p>
              <p><strong>Waitlisted</strong><span>{guestEvent.waitlistedCount}</span></p>
              <p><strong>Open seats</strong><span>{guestEvent.remainingSeats ?? "No cap"}</span></p>
            </div>
            <div className="drawer-actions">
              <button
                type="button"
                className="small-button bronze"
                onClick={() => {
                  setDetailsEventId(guestEvent.id);
                  setGuestEventId(null);
                }}
              >
                Send Details
              </button>
            </div>
            <div className="drawer-section">
              {guestEvent.attendees.length ? (
                <div className="guest-status-list">
                  {RESERVATION_STATUS_GROUPS.map((status) => {
                    const attendees = guestEvent.attendees.filter(
                      (attendee) => attendee.status === status,
                    );

                    if (!attendees.length) return null;

                    return (
                      <section className="guest-status-group" key={status}>
                        <h3>{prettyStatus(status)}</h3>
                        <div className="guest-list">
                          {attendees.map((attendee) => (
                            <article className="guest-row" key={attendee.id}>
                              <span>
                                <strong>{attendee.memberName}</strong>
                                <em>{attendee.memberEmail}</em>
                              </span>
                              <span>
                                {attendee.cancellationReason
                                  ? attendee.cancellationReason
                                  : compactDate(attendee.createdAt)}
                              </span>
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <p className="section-copy">No one has registered for this event yet.</p>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {detailsEvent ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Send event details">
          <aside className="admin-drawer wide-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Email Details</p>
                <h2 className="panel-title">{detailsEvent.title}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setDetailsEventId(null)}
              >
                Close
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>When</strong><span>{formatExperienceDate(detailsEvent.dateTime)}</span></p>
              <p><strong>Where</strong><span>{detailsEvent.location}</span></p>
              <p><strong>Confirmed</strong><span>{detailsEvent.confirmedCount}</span></p>
              <p><strong>Pending</strong><span>{detailsEvent.requestedCount}</span></p>
            </div>
            <form className="field-grid drawer-form event-details-form" onSubmit={sendEventDetails}>
              <fieldset className="field full-field event-recipient-field">
                <legend>Recipients</legend>
                <div className="choice-grid">
                  <label className="choice">
                    <input name="recipientStatuses" type="checkbox" value="CONFIRMED" defaultChecked />
                    <span>Confirmed ({detailsEvent.confirmedCount})</span>
                  </label>
                  <label className="choice">
                    <input name="recipientStatuses" type="checkbox" value="REQUESTED" />
                    <span>Pending ({detailsEvent.requestedCount})</span>
                  </label>
                  <label className="choice">
                    <input name="recipientStatuses" type="checkbox" value="WAITLISTED" />
                    <span>Waitlist ({detailsEvent.waitlistedCount})</span>
                  </label>
                  <label className="choice">
                    <input name="recipientStatuses" type="checkbox" value="CANCELLATION_REQUESTED" />
                    <span>Cancellations ({detailsEvent.cancellationRequestCount})</span>
                  </label>
                </div>
              </fieldset>
              <label className="field full-field">
                <span>Subject</span>
                <input
                  name="subject"
                  className="input"
                  defaultValue={`Details for ${detailsEvent.title}`}
                  required
                />
              </label>
              <label className="field">
                <span>Meeting point</span>
                <input
                  name="meetingPoint"
                  className="input"
                  defaultValue={detailsEvent.location}
                  required
                />
              </label>
              <label className="field">
                <span>Arrival window</span>
                <input name="arrivalWindow" className="input" placeholder="Example: 10 minutes before start" />
              </label>
              <label className="field full-field">
                <span>Location notes</span>
                <textarea
                  name="locationDetails"
                  className="textarea"
                  placeholder="Exact address, landmark, parking, entry instructions"
                />
              </label>
              <label className="field">
                <span>Dress code</span>
                <input name="dressCode" className="input" />
              </label>
              <label className="field">
                <span>What to bring</span>
                <input name="whatToBring" className="input" />
              </label>
              <label className="field full-field">
                <span>Contact</span>
                <input name="contact" className="input" placeholder="Name and phone for event-day coordination" />
              </label>
              <label className="field full-field">
                <span>Note</span>
                <textarea
                  name="note"
                  className="textarea"
                  placeholder="Anything else they should know before arriving"
                />
              </label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading(`experience:${detailsEvent.id}:details`)}
              >
                {isLoading(`experience:${detailsEvent.id}:details`) ? "Sending" : "Send details email"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {selectedFeedback ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Feedback details">
          <aside className="admin-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Feedback</p>
                <h2 className="panel-title">{selectedFeedback.subject}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setSelectedFeedbackId(null)}
              >
                Close
              </button>
            </div>
            <div className="detail-grid">
              <p><strong>Member</strong><span>{selectedFeedback.memberName}</span></p>
              <p><strong>Email</strong><span>{selectedFeedback.memberEmail}</span></p>
              <p><strong>Category</strong><span>{selectedFeedback.category.replace(/_/g, " ")}</span></p>
              <p><strong>Status</strong><span>{prettyStatus(selectedFeedback.status)}</span></p>
            </div>
            <div className="drawer-section">
              {selectedFeedback.messages.map((message) => (
                <p className="section-copy" key={message.id}>
                  <strong>{message.isAdmin ? "Admin" : selectedFeedback.memberName}:</strong>{" "}
                  {message.message}
                </p>
              ))}
            </div>
            <form className="field-grid drawer-form" onSubmit={(event) => updateFeedback(event, selectedFeedback.id)}>
              <label className="field">
                <span>Status</span>
                <select name="status" className="input" defaultValue={selectedFeedback.status}>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="REPLIED">Replied</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
              <label className="field full-field">
                <span>Reply</span>
                <textarea name="reply" className="textarea" />
              </label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading(`feedback:${selectedFeedback.id}:update`)}
              >
                {isLoading(`feedback:${selectedFeedback.id}:update`) ? "Saving" : "Save Reply"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {isAddingMember ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Add member">
          <aside className="admin-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Add Member</p>
                <h2 className="panel-title">Approve directly</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setIsAddingMember(false)}
              >
                Close
              </button>
            </div>
            <div className="drawer-section">
              <p className="section-copy">
                This creates approved access and sends a private setup link by email.
              </p>
            </div>
            <form className="field-grid drawer-form" onSubmit={addMember}>
              <label className="field full-field">
                <span>Full name</span>
                <input name="fullName" className="input" required />
              </label>
              <label className="field full-field">
                <span>Email</span>
                <input name="email" type="email" className="input" required />
              </label>
              <label className="field">
                <span>Role</span>
                <select name="role" className="input" defaultValue="MEMBER">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading("member:add")}
              >
                {isLoading("member:add") ? "Adding" : "Add and send setup email"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {editingMember ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Edit member">
          <aside className="admin-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Edit Member</p>
                <h2 className="panel-title">{editingMember.fullName}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setEditingMemberId(null)}
              >
                Close
              </button>
            </div>
            <form className="field-grid drawer-form" onSubmit={(event) => saveMember(event, editingMember.id)}>
              <label className="field full-field">
                <span>Full name</span>
                <input name="fullName" className="input" defaultValue={editingMember.fullName} required />
              </label>
              <label className="field full-field">
                <span>Email</span>
                <input name="email" type="email" className="input" defaultValue={editingMember.email} required />
              </label>
              <label className="field">
                <span>Role</span>
                <select name="role" className="input" defaultValue={editingMember.role}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
              <label className="field">
                <span>Access status</span>
                <select name="accessStatus" className="input" defaultValue={editingMember.accessStatus}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="WAITLISTED">Waitlisted</option>
                  <option value="DECLINED">Declined</option>
                </select>
              </label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading(`member:${editingMember.id}:save`)}
              >
                {isLoading(`member:${editingMember.id}:save`) ? "Saving" : "Save member"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {deleteMemberTarget ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Delete member confirmation">
          <aside className="confirm-modal">
            <p className="eyebrow">Destructive action</p>
            <h2 className="panel-title">Delete {deleteMemberTarget.fullName}?</h2>
            <p className="section-copy">
              This permanently removes the member account, sessions, reservations,
              and referrals tied to this member. This cannot be undone.
            </p>
            <div className="drawer-actions">
              <button
                type="button"
                className="small-button danger"
                disabled={isLoading(`member:${deleteMemberTarget.id}:delete`)}
                onClick={() => deleteMember(deleteMemberTarget.id)}
              >
                {isLoading(`member:${deleteMemberTarget.id}:delete`) ? "Deleting" : "Delete member"}
              </button>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setDeleteMemberTargetId(null)}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {editingExperience ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Edit event">
          <aside className="admin-drawer wide-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">Edit Event</p>
                <h2 className="panel-title">{editingExperience.title}</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setEditingExperienceId(null)}
              >
                Close
              </button>
            </div>
            <form className="field-grid drawer-form" onSubmit={(event) => saveExperience(event, editingExperience.id)}>
              <label className="field"><span>Title</span><input name="title" className="input" defaultValue={editingExperience.title} required /></label>
              <label className="field"><span>Slug</span><input name="slug" className="input" defaultValue={editingExperience.slug} required /></label>
              <label className="field"><span>Location</span><input name="location" className="input" defaultValue={editingExperience.location} required /></label>
              <label className="field"><span>Date and time</span><input name="dateTime" type="datetime-local" className="input" defaultValue={toDateTimeLocal(editingExperience.dateTime)} required /></label>
              <EventImageField defaultValue={editingExperience.imageUrl} />
              <label className="field"><span>Seats</span><input name="seatsTotal" type="number" min="1" className="input" defaultValue={editingExperience.seatsTotal ?? ""} /></label>
              <label className="field full-field"><span>Description</span><textarea name="description" className="textarea" defaultValue={editingExperience.description} required /></label>
              <label className="field"><span>Hosted by label</span><input name="hostedByLabel" className="input" defaultValue={editingExperience.hostedByLabel} required /></label>
              <label className="field"><span>Host name</span><input name="hostName" className="input" defaultValue={editingExperience.hostName} required /></label>
              <label className="field"><span>Host title</span><input name="hostTitle" className="input" defaultValue={editingExperience.hostTitle ?? ""} /></label>
              <label className="field full-field"><span>Host bio</span><textarea name="hostBio" className="textarea" defaultValue={editingExperience.hostBio ?? ""} /></label>
              <label className="field">
                <span>Status</span>
                <select name="status" className="input" defaultValue={editingExperience.status}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="POSTPONED">Postponed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>
              <label className="field">
                <span>Audience</span>
                <select name="visibilityType" className="input" defaultValue={editingExperience.visibilityType}>
                  <option value="ALL_MEMBERS">All Members</option>
                  <option value="SELECTED_MEMBERS">Selected Members</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                </select>
              </label>
              <label className="field full-field">
                <span>Selected members</span>
                <select
                  name="selectedMemberIds"
                  className="input"
                  multiple
                  defaultValue={editingExperience.selectedMemberIds}
                >
                  {memberState
                    .filter((member) => member.accessStatus === "APPROVED")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} · {member.email}
                      </option>
                    ))}
                </select>
              </label>
              <label className="choice"><input name="isVisible" type="checkbox" defaultChecked={editingExperience.isVisible} /><span>Visible</span></label>
              <label className="choice"><input name="isInviteOnly" type="checkbox" defaultChecked={editingExperience.isInviteOnly} /><span>Invite-only</span></label>
              <label className="choice"><input name="isArchived" type="checkbox" defaultChecked={editingExperience.isArchived} /><span>Archived</span></label>
              <label className="choice"><input name="attendeeVisibilityEnabled" type="checkbox" defaultChecked={editingExperience.attendeeVisibilityEnabled} /><span>Attendee visibility</span></label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading(`experience:${editingExperience.id}:save`)}
              >
                {isLoading(`experience:${editingExperience.id}:save`) ? "Saving" : "Save event"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {isCreatingExperience ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Create event">
          <aside className="admin-drawer wide-drawer">
            <div className="drawer-head">
              <div>
                <p className="eyebrow">New Event</p>
                <h2 className="panel-title">Add a gathering</h2>
              </div>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setIsCreatingExperience(false)}
              >
                Close
              </button>
            </div>
            <form className="field-grid drawer-form" onSubmit={createExperience}>
              <label className="field"><span>Title</span><input name="title" className="input" required /></label>
              <label className="field"><span>Slug</span><input name="slug" className="input" required /></label>
              <label className="field"><span>Location</span><input name="location" className="input" required /></label>
              <label className="field"><span>Date and time</span><input name="dateTime" type="datetime-local" className="input" required /></label>
              <EventImageField />
              <label className="field"><span>Seats</span><input name="seatsTotal" type="number" min="1" className="input" /></label>
              <label className="field full-field"><span>Description</span><textarea name="description" className="textarea" required /></label>
              <label className="field"><span>Hosted by label</span><input name="hostedByLabel" className="input" required /></label>
              <label className="field"><span>Host name</span><input name="hostName" className="input" required /></label>
              <label className="field"><span>Host title</span><input name="hostTitle" className="input" /></label>
              <label className="field full-field"><span>Host bio</span><textarea name="hostBio" className="textarea" /></label>
              <label className="field">
                <span>Status</span>
                <select name="status" className="input" defaultValue="DRAFT">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="field">
                <span>Audience</span>
                <select name="visibilityType" className="input" defaultValue="ALL_MEMBERS">
                  <option value="ALL_MEMBERS">All Members</option>
                  <option value="SELECTED_MEMBERS">Selected Members</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                </select>
              </label>
              <label className="field full-field">
                <span>Selected members</span>
                <select name="selectedMemberIds" className="input" multiple>
                  {memberState
                    .filter((member) => member.accessStatus === "APPROVED")
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} · {member.email}
                      </option>
                    ))}
                </select>
              </label>
              <label className="choice"><input name="isVisible" type="checkbox" /><span>Visible</span></label>
              <label className="choice"><input name="isInviteOnly" type="checkbox" defaultChecked /><span>Invite-only</span></label>
              <label className="choice"><input name="attendeeVisibilityEnabled" type="checkbox" defaultChecked /><span>Attendee visibility</span></label>
              <button
                className="small-button bronze full-field"
                disabled={isLoading("experience:create")}
              >
                {isLoading("experience:create") ? "Creating" : "Create event"}
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      {lifecycleTarget && lifecycleExperience ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Confirm event status update">
          <aside className="confirm-modal">
            <p className="eyebrow">Event Status</p>
            <h2 className="panel-title">
              {prettyStatus(lifecycleTarget.action)} {lifecycleExperience.title}?
            </h2>
            <p className="section-copy">
              {lifecycleTarget.action === "publish"
                ? "This will publish the event and notify eligible members only once."
                : lifecycleTarget.action === "postpone"
                  ? "This will stop new registrations and notify affected members."
                  : lifecycleTarget.action === "cancel"
                    ? "This will stop new registrations, keep the event in history, and notify affected members."
                    : lifecycleTarget.action === "archive"
                      ? "This will remove the event from active views while keeping its history."
                      : "This will return the event to draft."}
            </p>
            <form className="field-grid" onSubmit={runLifecycleAction}>
              {lifecycleTarget.action === "postpone" ? (
                <label className="field">
                  <span>Postponement message</span>
                  <textarea name="postponementMessage" className="textarea" required />
                </label>
              ) : null}
              {lifecycleTarget.action === "cancel" ? (
                <label className="field">
                  <span>Cancellation reason</span>
                  <textarea name="cancellationReason" className="textarea" required />
                </label>
              ) : null}
              <div className="drawer-actions">
                <button
                  className={
                    lifecycleTarget.action === "cancel"
                      ? "small-button danger"
                      : "small-button bronze"
                  }
                  disabled={isLoading(`experience:${lifecycleTarget.id}:${lifecycleTarget.action}`)}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="small-button secondary"
                  onClick={() => setLifecycleTarget(null)}
                >
                  Keep Editing
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Delete event confirmation">
          <aside className="confirm-modal">
            <p className="eyebrow">Destructive action</p>
            <h2 className="panel-title">Delete {deleteTarget.title}?</h2>
            {deleteTarget.reservationCount > 0 ? (
              <p className="section-copy">
                This event has reservations, so it should be archived instead of deleted.
                Archiving keeps the history intact and removes it from active use.
              </p>
            ) : (
              <p className="section-copy">
                This permanently removes the event. This cannot be undone.
              </p>
            )}
            <div className="drawer-actions">
              {deleteTarget.reservationCount > 0 ? (
                <button
                  type="button"
                  className="small-button bronze"
                  disabled={isLoading(`experience:${deleteTarget.id}:archive`)}
                  onClick={() => {
                    setLifecycleTarget({ id: deleteTarget.id, action: "archive" });
                    setDeleteTargetId(null);
                  }}
                >
                  Archive event
                </button>
              ) : (
                <button
                  type="button"
                  className="small-button danger"
                  disabled={isLoading(`experience:${deleteTarget.id}:delete`)}
                  onClick={() => deleteExperience(deleteTarget.id)}
                >
                  {isLoading(`experience:${deleteTarget.id}:delete`) ? "Deleting" : "Delete permanently"}
                </button>
              )}
              <button
                type="button"
                className="small-button secondary"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
