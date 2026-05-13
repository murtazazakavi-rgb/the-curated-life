"use client";

import { useMemo, useState, type FormEvent } from "react";
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
  confirmedCount: number;
  reservationCount: number;
  remainingSeats?: number | null;
};

type ExperienceApiView = Omit<
  ExperienceView,
  "confirmedCount" | "reservationCount" | "remainingSeats"
> & {
  confirmedCount?: number;
  reservationCount?: number;
  remainingSeats?: number | null;
};

type ReservationView = {
  id: string;
  status: string;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  experienceTitle: string;
  seatsTotal?: number | null;
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

type AdminConsoleProps = {
  requests: AccessRequestView[];
  experiences: ExperienceView[];
  reservations: ReservationView[];
  referrals: ReferralView[];
  members: MemberView[];
  emailLogs: EmailLogView[];
};

type AdminTab =
  | "dashboard"
  | "requests"
  | "members"
  | "events"
  | "reservations"
  | "referrals"
  | "emails";

type Toast = {
  tone: "success" | "error";
  message: string;
} | null;

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
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "requests", label: "Access Requests" },
  { id: "members", label: "Members" },
  { id: "events", label: "Events" },
  { id: "reservations", label: "Reservations" },
  { id: "referrals", label: "Referrals" },
  { id: "emails", label: "Emails" },
];

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function seatsLabel(experience: ExperienceView) {
  if (!experience.seatsTotal) return `${experience.confirmedCount} confirmed`;
  return `${experience.confirmedCount}/${experience.seatsTotal} confirmed · ${experience.remainingSeats ?? 0} open`;
}

function prettyStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    reservationCount: next.reservationCount ?? current.reservationCount,
    remainingSeats:
      seatsTotal === null ? null : Math.max(seatsTotal - confirmedCount, 0),
  };
}

export function AdminConsole({
  requests,
  experiences,
  reservations,
  referrals,
  members,
  emailLogs,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [requestState, setRequestState] = useState(requests);
  const [experienceState, setExperienceState] = useState(experiences);
  const [reservationState, setReservationState] = useState(reservations);
  const [requestFilter, setRequestFilter] = useState("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [isCreatingExperience, setIsCreatingExperience] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const selectedRequest = requestState.find(
    (request) => request.id === selectedRequestId,
  );
  const editingExperience = experienceState.find(
    (experience) => experience.id === editingExperienceId,
  );
  const deleteTarget = experienceState.find(
    (experience) => experience.id === deleteTargetId,
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
    return members.filter(
      (member) =>
        !q ||
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q),
    );
  }, [memberSearch, members]);

  const dashboardCards = [
    {
      label: "Pending requests",
      value: requestState.filter((request) => request.status === "PENDING").length,
    },
    {
      label: "Approved members",
      value: members.filter((member) => member.accessStatus === "APPROVED").length,
    },
    {
      label: "Live events",
      value: experienceState.filter(
        (experience) => experience.isVisible && !experience.isArchived,
      ).length,
    },
    {
      label: "Reservation requests",
      value: reservationState.filter(
        (reservation) => reservation.status === "REQUESTED",
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
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      } & T;

      if (!response.ok) {
        throw new Error(payload.error ?? fallbackError);
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

  async function reviewRequest(id: string, action: AccessAction) {
    const key = `request:${id}:${action}`;
    const payload = await runJson<{ status: string }>(
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
    showToast(
      "success",
      action === "resend_setup"
        ? "Password setup email resent."
        : `Access request ${prettyStatus(payload.status).toLowerCase()}.`,
    );
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
          ? hydrateExperience(experience, payload.experience)
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
        reservationCount: 0,
        remainingSeats: seatsTotal,
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
    showToast("success", "Reservation updated and email sent.");
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
                <span className="status-pill">{filteredMembers.length}</span>
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
                    Manage calendar
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
              <div className="admin-list event-list">
                {experienceState.map((experience) => (
                  <article className="admin-list-row is-static event-row" key={experience.id}>
                    <span className="admin-row-main">
                      <strong>{experience.title}</strong>
                      <span>
                        {formatExperienceDate(experience.dateTime)} · {experience.location}
                      </span>
                    </span>
                    <span className="admin-row-meta event-row__meta">
                      <span className={`status-pill ${experience.isVisible ? "status-approved" : "status-muted"}`}>
                        {experience.isVisible ? "Visible" : "Hidden"}
                      </span>
                      <span className={`status-pill ${experience.isArchived ? "status-declined" : "status-approved"}`}>
                        {experience.isArchived ? "Archived" : "Active"}
                      </span>
                      <span>{seatsLabel(experience)}</span>
                    </span>
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
                        disabled={isLoading(`experience:${experience.id}:visibility`)}
                        onClick={() =>
                          patchExperience(
                            experience.id,
                            { isVisible: !experience.isVisible },
                            experience.isVisible
                              ? "Event hidden from homepage."
                              : "Event is visible on homepage.",
                            "visibility",
                          )
                        }
                      >
                        {isLoading(`experience:${experience.id}:visibility`)
                          ? "Saving"
                          : experience.isVisible
                            ? "Hide"
                            : "Show"}
                      </button>
                      <button
                        type="button"
                        className="small-button secondary"
                        disabled={isLoading(`experience:${experience.id}:archive`)}
                        onClick={() =>
                          patchExperience(
                            experience.id,
                            { isArchived: !experience.isArchived },
                            experience.isArchived
                              ? "Event restored."
                              : "Event archived.",
                            "archive",
                          )
                        }
                      >
                        {isLoading(`experience:${experience.id}:archive`)
                          ? "Saving"
                          : experience.isArchived
                            ? "Restore"
                            : "Archive"}
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
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "reservations" ? (
            <section className="admin-panel" aria-labelledby="admin-reservations-title">
              <div className="admin-panel__top">
                <div>
                  <p className="eyebrow">Reservations</p>
                  <h2 id="admin-reservations-title" className="panel-title">
                    Booking requests
                  </h2>
                </div>
                <span className="status-pill">{reservationState.length}</span>
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
                        <span>{compactDate(reservation.createdAt)}</span>
                      </span>
                      <span className="admin-actions">
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
              <label className="field"><span>Image URL</span><input name="imageUrl" className="input" defaultValue={editingExperience.imageUrl} required /></label>
              <label className="field"><span>Seats</span><input name="seatsTotal" type="number" min="1" className="input" defaultValue={editingExperience.seatsTotal ?? ""} /></label>
              <label className="field full-field"><span>Description</span><textarea name="description" className="textarea" defaultValue={editingExperience.description} required /></label>
              <label className="field"><span>Hosted by label</span><input name="hostedByLabel" className="input" defaultValue={editingExperience.hostedByLabel} required /></label>
              <label className="field"><span>Host name</span><input name="hostName" className="input" defaultValue={editingExperience.hostName} required /></label>
              <label className="field"><span>Host title</span><input name="hostTitle" className="input" defaultValue={editingExperience.hostTitle ?? ""} /></label>
              <label className="field full-field"><span>Host bio</span><textarea name="hostBio" className="textarea" defaultValue={editingExperience.hostBio ?? ""} /></label>
              <label className="choice"><input name="isVisible" type="checkbox" defaultChecked={editingExperience.isVisible} /><span>Visible</span></label>
              <label className="choice"><input name="isInviteOnly" type="checkbox" defaultChecked={editingExperience.isInviteOnly} /><span>Invite-only</span></label>
              <label className="choice"><input name="isArchived" type="checkbox" defaultChecked={editingExperience.isArchived} /><span>Archived</span></label>
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
              <label className="field"><span>Image URL</span><input name="imageUrl" className="input" required /></label>
              <label className="field"><span>Seats</span><input name="seatsTotal" type="number" min="1" className="input" /></label>
              <label className="field full-field"><span>Description</span><textarea name="description" className="textarea" required /></label>
              <label className="field"><span>Hosted by label</span><input name="hostedByLabel" className="input" required /></label>
              <label className="field"><span>Host name</span><input name="hostName" className="input" required /></label>
              <label className="field"><span>Host title</span><input name="hostTitle" className="input" /></label>
              <label className="field full-field"><span>Host bio</span><textarea name="hostBio" className="textarea" /></label>
              <label className="choice"><input name="isVisible" type="checkbox" defaultChecked /><span>Visible</span></label>
              <label className="choice"><input name="isInviteOnly" type="checkbox" defaultChecked /><span>Invite-only</span></label>
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
                  onClick={async () => {
                    const archived = await patchExperience(
                      deleteTarget.id,
                      { isArchived: true },
                      "Event archived instead of deleted.",
                      "archive",
                    );
                    if (archived) setDeleteTargetId(null);
                  }}
                >
                  {isLoading(`experience:${deleteTarget.id}:archive`) ? "Archiving" : "Archive event"}
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
