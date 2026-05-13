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

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function seatsLabel(experience: ExperienceView) {
  if (!experience.seatsTotal) return `${experience.confirmedCount} confirmed`;
  return `${experience.confirmedCount} confirmed · ${experience.remainingSeats ?? 0} remaining`;
}

export function AdminConsole({
  requests,
  experiences,
  reservations,
  referrals,
  members,
  emailLogs,
}: AdminConsoleProps) {
  const [requestState, setRequestState] = useState(requests);
  const [experienceState, setExperienceState] = useState(experiences);
  const [reservationState, setReservationState] = useState(reservations);
  const [requestFilter, setRequestFilter] = useState("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [message, setMessage] = useState("");

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return requestState.filter((request) => {
      const statusMatch =
        requestFilter === "ALL" || request.status === requestFilter;
      const searchMatch =
        !q ||
        request.fullName.toLowerCase().includes(q) ||
        request.email.toLowerCase().includes(q);
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

  const dashboard = {
    pendingRequests: requestState.filter((request) => request.status === "PENDING")
      .length,
    approvedMembers: members.filter((member) => member.accessStatus === "APPROVED")
      .length,
    visibleEvents: experienceState.filter(
      (experience) => experience.isVisible && !experience.isArchived,
    ).length,
    reservationRequests: reservationState.filter(
      (reservation) => reservation.status === "REQUESTED",
    ).length,
    waitlistedMembers: requestState.filter((request) => request.status === "WAITLISTED")
      .length,
    recentReferrals: referrals.length,
    failedEmails: emailLogs.filter((email) => email.status === "FAILED").length,
  };

  async function reviewRequest(
    id: string,
    action: "approve" | "decline" | "waitlist" | "resend_setup",
    adminNote?: string,
  ) {
    setMessage("");

    const response = await fetch(`/api/admin/access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update access request.");
      return;
    }

    setRequestState((current) =>
      current.map((request) =>
        request.id === id
          ? {
              ...request,
              status: payload.status,
              adminNote: adminNote || request.adminNote,
              reviewedAt:
                action === "resend_setup"
                  ? request.reviewedAt
                  : new Date().toISOString(),
            }
          : request,
      ),
    );
    setMessage(
      action === "resend_setup"
        ? "Password setup email resent."
        : "Access request updated.",
    );
  }

  async function updateExperience(id: string, data: Partial<ExperienceView>) {
    setMessage("");

    const response = await fetch(`/api/admin/experiences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update experience.");
      return;
    }

    setExperienceState((current) =>
      current.map((experience) =>
        experience.id === id
          ? {
              ...experience,
              ...payload.experience,
              dateTime: payload.experience.dateTime,
            }
          : experience,
      ),
    );
    setMessage("Experience updated.");
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const seatsValue = String(formData.get("seatsTotal") ?? "");

    await updateExperience(id, {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      dateTime: String(formData.get("dateTime") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      hostedByLabel: String(formData.get("hostedByLabel") ?? ""),
      hostName: String(formData.get("hostName") ?? ""),
      hostTitle: String(formData.get("hostTitle") ?? ""),
      hostBio: String(formData.get("hostBio") ?? ""),
      seatsTotal: seatsValue ? Number(seatsValue) : null,
      isVisible: formData.get("isVisible") === "on",
      isInviteOnly: formData.get("isInviteOnly") === "on",
      isArchived: formData.get("isArchived") === "on",
    });
  }

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const seatsValue = String(formData.get("seatsTotal") ?? "");
    const payload = {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      dateTime: String(formData.get("dateTime") ?? ""),
      imageUrl: String(formData.get("imageUrl") ?? ""),
      hostedByLabel: String(formData.get("hostedByLabel") ?? ""),
      hostName: String(formData.get("hostName") ?? ""),
      hostTitle: String(formData.get("hostTitle") ?? ""),
      hostBio: String(formData.get("hostBio") ?? ""),
      seatsTotal: seatsValue ? Number(seatsValue) : null,
      isVisible: formData.get("isVisible") === "on",
      isInviteOnly: formData.get("isInviteOnly") === "on",
      isArchived: false,
    };

    const response = await fetch("/api/admin/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      setMessage(body.error ?? "Could not create experience.");
      return;
    }

    setExperienceState((current) => [
      ...current,
      { ...body.experience, confirmedCount: 0, remainingSeats: payload.seatsTotal },
    ]);
    event.currentTarget.reset();
    setMessage("Experience created.");
  }

  async function deleteExperience(id: string) {
    setMessage("");

    const response = await fetch(`/api/admin/experiences/${id}`, {
      method: "DELETE",
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not delete event.");
      return;
    }

    setExperienceState((current) =>
      current.filter((experience) => experience.id !== id),
    );
    setMessage("Event permanently deleted.");
  }

  async function updateReservation(id: string, status: "CONFIRMED" | "WAITLISTED" | "CANCELLED") {
    setMessage("");

    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update reservation.");
      return;
    }

    setReservationState((current) =>
      current.map((reservation) =>
        reservation.id === id ? { ...reservation, status: payload.reservation.status } : reservation,
      ),
    );
    setMessage("Reservation updated and email sent.");
  }

  return (
    <div className="dashboard-section">
      <div className="wrap admin-layout">
        <aside className="dark-panel">
          <div className="dark-panel__inner">
            <p className="eyebrow on-dark">Admin</p>
            <h1 className="section-title">
              Keep the circle <em>considered.</em>
            </h1>
            <p className="hero-copy">
              Review access, manage members and events, and keep email
              correspondence visible.
            </p>
            <p className="form-status" role="status" style={{ color: "#D8CBB8" }}>
              {message}
            </p>
          </div>
        </aside>

        <div className="stack">
          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h2 className="panel-title">Private platform</h2>
              </div>
            </div>
            <div className="editorial-grid">
              {Object.entries(dashboard).map(([label, value]) => (
                <article className="editorial-note" key={label}>
                  <p className="eyebrow">{label.replace(/([A-Z])/g, " $1")}</p>
                  <h3>{value}</h3>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Access Requests</p>
                <h2 className="panel-title">Review applications</h2>
              </div>
              <span className="status-pill">{filteredRequests.length}</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Search</label>
                <input
                  className="input"
                  value={requestSearch}
                  onChange={(event) => setRequestSearch(event.target.value)}
                  placeholder="Name or email"
                />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  className="input"
                  value={requestFilter}
                  onChange={(event) => setRequestFilter(event.target.value)}
                >
                  {["ALL", "PENDING", "APPROVED", "WAITLISTED", "DECLINED"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="admin-table">
              {filteredRequests.length ? (
                filteredRequests.map((request) => (
                  <article className="admin-row" key={request.id}>
                    <form
                      className="field-grid"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        reviewRequest(
                          request.id,
                          "approve",
                          String(formData.get("adminNote") ?? ""),
                        );
                      }}
                    >
                      <div>
                        <h3>{request.fullName}</h3>
                        <p className="section-copy">
                          {request.email} · {request.phone}
                        </p>
                        <p className="microcopy">
                          Status: {request.status}
                          {request.reviewedAt
                            ? ` · reviewed ${new Date(request.reviewedAt).toLocaleDateString()}`
                            : ""}
                        </p>
                        <p className="section-copy">{request.message}</p>
                        <p className="microcopy">
                          Referred by: {request.referredBy || "-"}
                        </p>
                        <p className="microcopy">
                          Interests: {request.interests.join(", ")}
                        </p>
                        <p className="microcopy">
                          Preferred: {request.preferredExperiences.join(", ")}
                        </p>
                      </div>
                      <div className="field">
                        <label>Admin notes</label>
                        <textarea
                          name="adminNote"
                          className="textarea"
                          defaultValue={request.adminNote ?? ""}
                        />
                      </div>
                      <div className="admin-actions">
                        <button className="small-button bronze">Approve</button>
                        <button
                          className="small-button secondary"
                          type="button"
                          onClick={() => reviewRequest(request.id, "waitlist")}
                        >
                          Waitlist
                        </button>
                        <button
                          className="small-button secondary"
                          type="button"
                          onClick={() => reviewRequest(request.id, "decline")}
                        >
                          Decline
                        </button>
                        {request.status === "APPROVED" ? (
                          <button
                            className="small-button secondary"
                            type="button"
                            onClick={() => reviewRequest(request.id, "resend_setup")}
                          >
                            Resend setup email
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </article>
                ))
              ) : (
                <p className="section-copy">No access requests match this view.</p>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Members</p>
                <h2 className="panel-title">Access holders</h2>
              </div>
              <span className="status-pill">{filteredMembers.length}</span>
            </div>
            <div className="field">
              <label>Search members</label>
              <input
                className="input"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Name or email"
              />
            </div>
            <div className="admin-table">
              {filteredMembers.map((member) => (
                <article className="admin-row" key={member.id}>
                  <h3>{member.fullName}</h3>
                  <p className="section-copy">{member.email}</p>
                  <p className="microcopy">
                    {member.role} · {member.accessStatus}
                    {member.passwordSetAt ? " · password set" : " · password pending"}
                    {member.suspendedAt ? " · suspended" : ""}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Events / Experiences</p>
                <h2 className="panel-title">Manage calendar</h2>
              </div>
              <span className="status-pill">{experienceState.length}</span>
            </div>
            <div className="admin-table">
              {experienceState.map((experience) => (
                <article className="admin-row" key={experience.id}>
                  <div className="admin-card__top">
                    <div>
                      <h3>{experience.title}</h3>
                      <p className="section-copy">
                        {formatExperienceDate(experience.dateTime)} · {experience.location}
                      </p>
                      <p className="microcopy">
                        {experience.isVisible ? "Visible on homepage" : "Hidden from homepage"} ·{" "}
                        {experience.isInviteOnly ? "Invite-only" : "Open"} ·{" "}
                        {experience.isArchived ? "Archived" : "Active"} ·{" "}
                        {seatsLabel(experience)}
                      </p>
                    </div>
                  </div>
                  <div className="admin-actions">
                    <button
                      className="small-button secondary"
                      onClick={() =>
                        updateExperience(experience.id, {
                          isVisible: !experience.isVisible,
                        })
                      }
                    >
                      {experience.isVisible ? "Hide from homepage" : "Show on homepage"}
                    </button>
                    <button
                      className="small-button secondary"
                      onClick={() =>
                        updateExperience(experience.id, {
                          isInviteOnly: !experience.isInviteOnly,
                        })
                      }
                    >
                      {experience.isInviteOnly ? "Mark open" : "Mark invite-only"}
                    </button>
                    <button
                      className="small-button secondary"
                      onClick={() =>
                        updateExperience(experience.id, { isArchived: true })
                      }
                    >
                      Archive event
                    </button>
                    <button
                      className="small-button secondary"
                      onClick={() => deleteExperience(experience.id)}
                    >
                      Delete permanently
                    </button>
                  </div>
                  <form
                    className="field-grid"
                    onSubmit={(event) => saveExperience(event, experience.id)}
                  >
                    <div className="field">
                      <label>Title</label>
                      <input name="title" className="input" defaultValue={experience.title} required />
                    </div>
                    <div className="field">
                      <label>Slug</label>
                      <input name="slug" className="input" defaultValue={experience.slug} required />
                    </div>
                    <div className="field">
                      <label>Location</label>
                      <input name="location" className="input" defaultValue={experience.location} required />
                    </div>
                    <div className="field">
                      <label>Date and time</label>
                      <input name="dateTime" type="datetime-local" className="input" defaultValue={toDateTimeLocal(experience.dateTime)} required />
                    </div>
                    <div className="field">
                      <label>Image URL</label>
                      <input name="imageUrl" className="input" defaultValue={experience.imageUrl} required />
                    </div>
                    <div className="field">
                      <label>Seats</label>
                      <input name="seatsTotal" type="number" min="1" className="input" defaultValue={experience.seatsTotal ?? ""} />
                    </div>
                    <div className="field">
                      <label>Description</label>
                      <textarea name="description" className="textarea" defaultValue={experience.description} required />
                    </div>
                    <div className="field">
                      <label>Hosted by label</label>
                      <input name="hostedByLabel" className="input" defaultValue={experience.hostedByLabel} required />
                    </div>
                    <div className="field">
                      <label>Host name</label>
                      <input name="hostName" className="input" defaultValue={experience.hostName} required />
                    </div>
                    <div className="field">
                      <label>Host title</label>
                      <input name="hostTitle" className="input" defaultValue={experience.hostTitle ?? ""} />
                    </div>
                    <div className="field">
                      <label>Host bio</label>
                      <textarea name="hostBio" className="textarea" defaultValue={experience.hostBio ?? ""} />
                    </div>
                    <label className="choice">
                      <input name="isVisible" type="checkbox" defaultChecked={experience.isVisible} />
                      <span>Visible on homepage</span>
                    </label>
                    <label className="choice">
                      <input name="isInviteOnly" type="checkbox" defaultChecked={experience.isInviteOnly} />
                      <span>Invite-only</span>
                    </label>
                    <label className="choice">
                      <input name="isArchived" type="checkbox" defaultChecked={experience.isArchived} />
                      <span>Archived</span>
                    </label>
                    <button className="small-button bronze">Save event details</button>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div>
              <p className="eyebrow">New event</p>
              <h2 className="panel-title">Add a gathering</h2>
            </div>
            <form className="field-grid" onSubmit={createExperience}>
              <div className="field"><label>Title</label><input name="title" className="input" required /></div>
              <div className="field"><label>Slug</label><input name="slug" className="input" required /></div>
              <div className="field"><label>Location</label><input name="location" className="input" required /></div>
              <div className="field"><label>Date and time</label><input name="dateTime" type="datetime-local" className="input" required /></div>
              <div className="field"><label>Image URL</label><input name="imageUrl" className="input" required /></div>
              <div className="field"><label>Seats</label><input name="seatsTotal" type="number" min="1" className="input" /></div>
              <div className="field"><label>Description</label><textarea name="description" className="textarea" required /></div>
              <div className="field"><label>Hosted by label</label><input name="hostedByLabel" className="input" required /></div>
              <div className="field"><label>Host name</label><input name="hostName" className="input" required /></div>
              <div className="field"><label>Host title</label><input name="hostTitle" className="input" /></div>
              <div className="field"><label>Host bio</label><textarea name="hostBio" className="textarea" /></div>
              <label className="choice"><input name="isVisible" type="checkbox" defaultChecked /><span>Visible on homepage</span></label>
              <label className="choice"><input name="isInviteOnly" type="checkbox" defaultChecked /><span>Invite-only</span></label>
              <button className="btn btn--ink btn--full">Create Event <span className="arrow" /></button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Reservations</p>
                <h2 className="panel-title">Requests</h2>
              </div>
              <span className="status-pill">{reservationState.length}</span>
            </div>
            <div className="admin-table">
              {reservationState.length ? (
                reservationState.map((reservation) => (
                  <article className="admin-row" key={reservation.id}>
                    <h3>{reservation.experienceTitle}</h3>
                    <p className="section-copy">
                      {reservation.memberName} · {reservation.memberEmail}
                    </p>
                    <p className="microcopy">{reservation.status}</p>
                    <div className="admin-actions">
                      <button className="small-button bronze" onClick={() => updateReservation(reservation.id, "CONFIRMED")}>Confirm reservation</button>
                      <button className="small-button secondary" onClick={() => updateReservation(reservation.id, "WAITLISTED")}>Waitlist reservation</button>
                      <button className="small-button secondary" onClick={() => updateReservation(reservation.id, "CANCELLED")}>Cancel reservation</button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="section-copy">No reservation requests yet.</p>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Referrals</p>
                <h2 className="panel-title">Member introductions</h2>
              </div>
              <span className="status-pill">{referrals.length}</span>
            </div>
            <div className="admin-table">
              {referrals.length ? (
                referrals.map((referral) => (
                  <article className="admin-row" key={referral.id}>
                    <h3>{referral.referredName}</h3>
                    <p className="section-copy">
                      {referral.referredEmail} · referred by {referral.referrerName}
                    </p>
                    <p className="microcopy">
                      {referral.relationship} · {referral.status}
                    </p>
                  </article>
                ))
              ) : (
                <p className="section-copy">No referrals yet.</p>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Emails</p>
                <h2 className="panel-title">Recent logs</h2>
              </div>
              <span className="status-pill">{emailLogs.length}</span>
            </div>
            <div className="admin-table">
              {emailLogs.length ? (
                emailLogs.map((email) => (
                  <article className="admin-row" key={email.id}>
                    <h3>{email.templateKey}</h3>
                    <p className="section-copy">{email.toEmail}</p>
                    <p className="microcopy">
                      {email.status} · {new Date(email.createdAt).toLocaleString()}
                    </p>
                  </article>
                ))
              ) : (
                <p className="section-copy">No email logs yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
