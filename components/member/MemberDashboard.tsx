"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { formatExperienceDate } from "@/lib/data/experiences";

type ExperienceView = {
  id: string;
  title: string;
  description: string;
  location: string;
  dateTime: string;
  hostedByLabel: string;
  hostName: string;
  hostTitle?: string | null;
  seatsTotal?: number | null;
  status: string;
  attendeeVisibilityEnabled: boolean;
  attendees: Array<{
    id: string;
    firstName: string;
    avatarUrl?: string | null;
  }>;
};

type ReservationView = {
  id: string;
  experienceId: string;
  status: string;
  cancellationRequestedAt?: string | null;
  cancellationReason?: string | null;
  experienceTitle: string;
  experienceDateTime: string;
  experienceLocation: string;
  eventStatus: string;
};

type ReferralView = {
  id: string;
  referredName: string;
  referredEmail: string;
  relationship: string;
  status: string;
};

type MemberDashboardProps = {
  member: {
    fullName: string;
    email: string;
    createdAt: string;
  };
  experiences: ExperienceView[];
  reservations: ReservationView[];
  referrals: ReferralView[];
  feedbackThreads: FeedbackThreadView[];
};

type FeedbackThreadView = {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    isAdmin: boolean;
    message: string;
    createdAt: string;
  }>;
};

type MemberTab = "invitations" | "bookings" | "refer" | "feedback";

const memberTabs: Array<{ id: MemberTab; label: string }> = [
  { id: "invitations", label: "Invitations" },
  { id: "bookings", label: "Bookings" },
  { id: "refer", label: "Refer" },
  { id: "feedback", label: "Help" },
];

export function MemberDashboard({
  member,
  experiences,
  reservations,
  referrals,
  feedbackThreads,
}: MemberDashboardProps) {
  const [reservationState, setReservationState] = useState(reservations);
  const [referralState, setReferralState] = useState(referrals);
  const [feedbackState, setFeedbackState] = useState(feedbackThreads);
  const [message, setMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [activeTab, setActiveTab] = useState<MemberTab>("invitations");
  const [cancellationTarget, setCancellationTarget] =
    useState<ReservationView | null>(null);
  const [now] = useState(() => Date.now());

  const reservationsByExperience = useMemo(() => {
    return new Map(
      reservationState.map((reservation) => [reservation.experienceId, reservation]),
    );
  }, [reservationState]);

  const upcomingHistory = reservationState.filter(
    (reservation) =>
      new Date(reservation.experienceDateTime).getTime() >= now &&
      !["CANCELLED"].includes(reservation.status) &&
      !["POSTPONED", "CANCELLED"].includes(reservation.eventStatus),
  );
  const pastHistory = reservationState.filter(
    (reservation) =>
      new Date(reservation.experienceDateTime).getTime() < now ||
      ["CANCELLED"].includes(reservation.status) ||
      ["POSTPONED", "CANCELLED"].includes(reservation.eventStatus),
  );
  const confirmedCount = reservationState.filter(
    (reservation) => reservation.status === "CONFIRMED",
  ).length;
  const pendingCount = reservationState.filter((reservation) =>
    ["REQUESTED", "WAITLISTED", "CANCELLATION_REQUESTED"].includes(
      reservation.status,
    ),
  ).length;

  async function reserve(experienceId: string) {
    setMessage("");

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ experience_id: experienceId }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "We could not receive that reservation request.");
      return;
    }

    setReservationState((current) => {
      const experience = experiences.find(
        (item) => item.id === payload.reservation.experienceId,
      );
      const enrichedReservation: ReservationView = {
        ...payload.reservation,
        experienceTitle: experience?.title ?? "Experience",
        experienceDateTime: experience?.dateTime ?? new Date().toISOString(),
        experienceLocation: experience?.location ?? "",
        eventStatus: experience?.status ?? "PUBLISHED",
      };
      const existing = current.filter(
        (reservation) => reservation.experienceId !== payload.reservation.experienceId,
      );
      return [...existing, enrichedReservation];
    });
    setMessage("Your request has been received.");
  }

  async function requestCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cancellationTarget) return;
    setMessage("");
    const formData = new FormData(event.currentTarget);

    const response = await fetch("/api/reservations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reservation_id: cancellationTarget.id,
        reason: String(formData.get("reason") ?? ""),
        note: String(formData.get("note") ?? ""),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "We could not cancel that reservation.");
      return;
    }

    setReservationState((current) =>
      current.map((reservation) =>
        reservation.id === cancellationTarget.id
          ? {
              ...reservation,
              status: payload.reservation.status,
              cancellationRequestedAt: payload.reservation.cancellationRequestedAt,
              cancellationReason: payload.reservation.cancellationReason,
            }
          : reservation,
      ),
    );
    setCancellationTarget(null);
    setMessage("Cancellation requested.");
  }

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReferralMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      referred_name: String(formData.get("referred_name") ?? ""),
      referred_email: String(formData.get("referred_email") ?? ""),
      relationship: String(formData.get("relationship") ?? ""),
      optional_note: String(formData.get("optional_note") ?? ""),
    };

    const response = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    if (!response.ok) {
      setReferralMessage(body.error ?? "We could not send that referral.");
      return;
    }

    setReferralState((current) => [body.referral, ...current]);
    event.currentTarget.reset();
    setReferralMessage("Invitation email sent with care.");
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      category: String(formData.get("category") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();

    if (!response.ok) {
      setFeedbackMessage(body.error ?? "We could not receive that note.");
      return;
    }

    setFeedbackState((current) => [body.thread, ...current]);
    event.currentTarget.reset();
    setFeedbackMessage("Your note has been received.");
  }

  async function signOut() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    window.location.href = "/";
  }

  return (
    <>
      <section className="member-dashboard">
        <div className="wrap member-dashboard__shell">
          <header className="member-dashboard__header">
            <div>
              <p className="eyebrow">Member dashboard</p>
              <h1 className="member-dashboard__title">{member.fullName}</h1>
              <p className="member-dashboard__meta">{member.email}</p>
            </div>
            <div className="member-dashboard__actions">
              <Link className="small-button secondary" href="/">
                Home
              </Link>
              <button className="small-button secondary" type="button" onClick={signOut}>
                Logout
              </button>
            </div>
          </header>

          <div className="member-stat-grid" aria-label="Member summary">
            <article className="member-stat">
              <span>Open invitations</span>
              <strong>{experiences.length}</strong>
            </article>
            <article className="member-stat">
              <span>Confirmed</span>
              <strong>{confirmedCount}</strong>
            </article>
            <article className="member-stat">
              <span>Pending</span>
              <strong>{pendingCount}</strong>
            </article>
            <article className="member-stat">
              <span>Referrals</span>
              <strong>{referralState.length}</strong>
            </article>
          </div>

          <nav className="member-tabs" aria-label="Member sections">
            {memberTabs.map((tab) => (
              <button
                className={`member-tab ${activeTab === tab.id ? "is-active" : ""}`}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="member-panel">
            {activeTab === "invitations" ? (
              <section aria-labelledby="member-invitations-title">
                <div className="member-panel__head">
                  <div>
                    <p className="eyebrow">Private invitations</p>
                    <h2 id="member-invitations-title" className="panel-title">
                      Available to you
                    </h2>
                  </div>
                  <p className="section-copy">
                    Reserve in one tap. Details stay tucked away until needed.
                  </p>
                </div>

                <div className="member-invitation-list">
                  {experiences.length ? (
                    experiences.map((experience) => {
                      const reservation = reservationsByExperience.get(experience.id);
                      const reservationStatus = reservation?.status;
                      const canSeeAttendees =
                        reservationStatus === "CONFIRMED" &&
                        experience.attendeeVisibilityEnabled;

                      return (
                        <article className="member-invite-card" key={experience.id}>
                          <div className="member-invite-card__main">
                            <div>
                              <p className="microcopy">{experience.hostedByLabel}</p>
                              <h3>{experience.title}</h3>
                              <div className="member-inline-meta">
                                <span>{formatExperienceDate(experience.dateTime)}</span>
                                <span>{experience.location}</span>
                              </div>
                            </div>
                            <span className="status-pill">
                              {reservationStatus === "CONFIRMED"
                                ? "Attending"
                                : reservationStatus === "CANCELLATION_REQUESTED"
                                  ? "Cancellation requested"
                                  : reservationStatus
                                    ? reservationStatus.replace(/_/g, " ")
                                    : "Available"}
                            </span>
                          </div>

                          <div className="member-card-actions">
                            <button
                              className="btn btn--ink"
                              type="button"
                              onClick={() => reserve(experience.id)}
                              disabled={Boolean(reservationStatus)}
                            >
                              {reservationStatus === "CONFIRMED"
                                ? "You're Attending"
                                : reservationStatus
                                  ? "Request Received"
                                  : "Reserve"}
                              <span className="arrow" />
                            </button>
                            {reservation &&
                            !["CANCELLED", "CANCELLATION_REQUESTED"].includes(
                              reservation.status,
                            ) ? (
                              <button
                                className="small-button secondary"
                                type="button"
                                onClick={() => setCancellationTarget(reservation)}
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>

                          <details className="member-details">
                            <summary>Details</summary>
                            <p className="section-copy">{experience.description}</p>
                            <p className="meta">
                              {experience.hostName}
                              {experience.hostTitle ? ` · ${experience.hostTitle}` : ""}
                            </p>
                            {canSeeAttendees ? (
                              <div className="attendee-section">
                                <p className="eyebrow">Who&apos;s attending</p>
                                <div className="attendee-list">
                                  {experience.attendees.map((attendee) => (
                                    <span className="attendee-chip" key={attendee.id}>
                                      <span className="attendee-avatar">
                                        {attendee.firstName.slice(0, 1)}
                                      </span>
                                      {attendee.firstName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </details>
                        </article>
                      );
                    })
                  ) : (
                    <p className="section-copy">
                      New private invitations will appear here as they are released.
                    </p>
                  )}
                </div>
                <p className="form-status" role="status">
                  {message}
                </p>
              </section>
            ) : null}

            {activeTab === "bookings" ? (
              <section aria-labelledby="member-bookings-title">
                <div className="member-panel__head">
                  <div>
                    <p className="eyebrow">Bookings</p>
                    <h2 id="member-bookings-title" className="panel-title">
                      Your reservations
                    </h2>
                  </div>
                </div>
                <div className="member-history-grid">
                  <div className="history-column">
                    <p className="eyebrow">Upcoming</p>
                    {upcomingHistory.length ? (
                      upcomingHistory.map((reservation) => (
                        <article className="history-card" key={reservation.id}>
                          <span className="status-pill">
                            {reservation.status === "CANCELLATION_REQUESTED"
                              ? "Cancellation pending"
                              : reservation.status.replace(/_/g, " ")}
                          </span>
                          <h3>{reservation.experienceTitle}</h3>
                          <p className="meta">
                            {formatExperienceDate(reservation.experienceDateTime)}
                          </p>
                          <p className="section-copy">
                            {reservation.experienceLocation}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="section-copy">No upcoming registrations yet.</p>
                    )}
                  </div>
                  <div className="history-column">
                    <p className="eyebrow">Past and updates</p>
                    {pastHistory.length ? (
                      pastHistory.map((reservation) => (
                        <article className="history-card" key={reservation.id}>
                          <span className="status-pill">
                            {reservation.eventStatus === "POSTPONED"
                              ? "Postponed"
                              : reservation.eventStatus === "CANCELLED" ||
                                  reservation.status === "CANCELLED"
                                ? "Cancelled"
                                : "Attended"}
                          </span>
                          <h3>{reservation.experienceTitle}</h3>
                          <p className="meta">
                            {formatExperienceDate(reservation.experienceDateTime)}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="section-copy">
                        Your attended experiences will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "refer" ? (
              <section aria-labelledby="member-refer-title">
                <div className="member-task-grid">
                  <div>
                    <p className="eyebrow">Referral by email</p>
                    <h2 id="member-refer-title" className="panel-title">
                      Invite someone thoughtful
                    </h2>
                    <p className="section-copy">
                      Send a warm note to someone you believe would feel naturally
                      aligned with this circle.
                    </p>
                  </div>
                  <form className="form-panel compact-task-form" onSubmit={submitReferral}>
                    <div className="field-grid">
                      <div className="field">
                        <label htmlFor="referred_name">Name</label>
                        <input
                          id="referred_name"
                          name="referred_name"
                          className="input"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="referred_email">Email</label>
                        <input
                          id="referred_email"
                          name="referred_email"
                          type="email"
                          className="input"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="relationship">Relationship</label>
                        <input
                          id="relationship"
                          name="relationship"
                          className="input"
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="optional_note">Optional note</label>
                        <textarea id="optional_note" name="optional_note" className="textarea" />
                      </div>
                      <button className="btn btn--ink btn--full">
                        Send Invitation Email <span className="arrow" />
                      </button>
                      <p className="form-status" role="status">
                        {referralMessage}
                      </p>
                    </div>
                  </form>
                </div>

                <div className="member-compact-list">
                  <p className="eyebrow">Sent referrals</p>
                  {referralState.length ? (
                    referralState.map((referral) => (
                      <article className="member-list-card" key={referral.id}>
                        <div>
                          <h3>{referral.referredName}</h3>
                          <p className="section-copy">{referral.referredEmail}</p>
                        </div>
                        <span className="status-pill">{referral.status}</span>
                      </article>
                    ))
                  ) : (
                    <p className="section-copy">No referrals sent yet.</p>
                  )}
                </div>
              </section>
            ) : null}

            {activeTab === "feedback" ? (
              <section aria-labelledby="member-feedback-title">
                <div className="member-task-grid">
                  <div>
                    <p className="eyebrow">Member notes</p>
                    <h2 id="member-feedback-title" className="panel-title">
                      Feedback and help
                    </h2>
                    <p className="section-copy">
                      Send experience feedback, product thoughts, technical issues,
                      suggestions, or a general message to the team.
                    </p>
                  </div>
                  <form className="form-panel compact-task-form" onSubmit={submitFeedback}>
                    <div className="field-grid">
                      <label className="field">
                        <span>Category</span>
                        <select
                          name="category"
                          className="input"
                          defaultValue="GENERAL_MESSAGE"
                        >
                          <option value="EXPERIENCE_FEEDBACK">Experience Feedback</option>
                          <option value="PRODUCT_FEEDBACK">Product Feedback</option>
                          <option value="TECHNICAL_ISSUE">Technical Issue</option>
                          <option value="SUGGESTION">Suggestion</option>
                          <option value="GENERAL_MESSAGE">General Message</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Subject</span>
                        <input name="subject" className="input" required />
                      </label>
                      <label className="field">
                        <span>Message</span>
                        <textarea name="message" className="textarea" required />
                      </label>
                      <button className="btn btn--ink btn--full">
                        Send Note <span className="arrow" />
                      </button>
                      <p className="form-status" role="status">
                        {feedbackMessage}
                      </p>
                    </div>
                  </form>
                </div>

                <div className="member-compact-list">
                  <p className="eyebrow">Recent notes</p>
                  {feedbackState.length ? (
                    feedbackState.map((thread) => (
                      <article className="member-list-card" key={thread.id}>
                        <div>
                          <h3>{thread.subject}</h3>
                          {thread.messages.slice(0, 1).map((item) => (
                            <p className="section-copy" key={item.id}>
                              {item.isAdmin ? "The Curated Life: " : "You: "}
                              {item.message}
                            </p>
                          ))}
                        </div>
                        <span className="status-pill">{thread.status.replace(/_/g, " ")}</span>
                      </article>
                    ))
                  ) : (
                    <p className="section-copy">No notes yet.</p>
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </section>

      {cancellationTarget ? (
        <div
          className="drawer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Request cancellation"
        >
          <aside className="confirm-modal">
            <p className="eyebrow">Request Cancellation</p>
            <h2 className="panel-title">{cancellationTarget.experienceTitle}</h2>
            <p className="section-copy">
              Your place will remain held until an admin reviews the request.
            </p>
            <form className="field-grid" onSubmit={requestCancellation}>
              <label className="field">
                <span>Reason</span>
                <input name="reason" className="input" required />
              </label>
              <label className="field">
                <span>Optional note</span>
                <textarea name="note" className="textarea" />
              </label>
              <div className="drawer-actions">
                <button className="small-button bronze">Request Cancellation</button>
                <button
                  type="button"
                  className="small-button secondary"
                  onClick={() => setCancellationTarget(null)}
                >
                  Keep My Spot
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
