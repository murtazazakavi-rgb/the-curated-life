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
      <section className="member-hero">
        <div className="wrap member-layout">
          <div className="dark-panel member-hero__welcome">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Welcome to the circle</p>
              <h1 className="display-title member-title">
                Your access <em>has been granted.</em>
              </h1>
              <p className="hero-copy">
                You can now view private invitations, reserve your place for selected
                experiences, and refer thoughtful people by email.
              </p>
              <div className="cta-row">
                <a className="btn btn--cream" href="#invitations">
                  View Invitations <span className="arrow" />
                </a>
                <a className="btn btn--ghost-light" href="#refer">
                  Refer Someone <span className="arrow" />
                </a>
                <a className="btn btn--ghost-light" href="#history">
                  My History <span className="arrow" />
                </a>
              </div>
            </div>
          </div>

          <aside className="member-card" aria-label="Member card">
            <div className="member-card__inner">
              <p className="eyebrow on-dark">Member card</p>
              <div>
                <p className="member-card__name">{member.fullName}</p>
                <p className="member-card__meta">{member.email}</p>
              </div>
              <p className="member-card__meta">
                Access holder · Email verified · Private invitations
              </p>
              <div className="member-card__actions">
                <Link className="btn btn--ghost-light btn--full" href="/">
                  Back to Home
                </Link>
                <button className="btn btn--cream btn--full" type="button" onClick={signOut}>
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section id="invitations" className="dashboard-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Private invitations</p>
              <h2 className="section-title">
                Available <em>to you.</em>
              </h2>
            </div>
            <p className="section-copy">
              Reservation requests are reviewed personally before confirmation.
            </p>
          </div>

          <div className="stack">
            {experiences.map((experience) => {
              const reservation = reservationsByExperience.get(experience.id);
              const reservationStatus = reservation?.status;
              const canSeeAttendees =
                reservationStatus === "CONFIRMED" &&
                experience.attendeeVisibilityEnabled;

              return (
                <article className="invite-card" key={experience.id}>
                  <div className="invite-card__top">
                    <div>
                      <p className="eyebrow">{experience.hostedByLabel}</p>
                      <h3>{experience.title}</h3>
                    </div>
                    <span className="status-pill">
                      {reservationStatus === "CONFIRMED"
                        ? "You're Attending"
                        : reservationStatus === "CANCELLATION_REQUESTED"
                          ? "Cancellation requested"
                          : reservationStatus
                            ? reservationStatus.replace(/_/g, " ")
                            : "Private Invitation"}
                    </span>
                  </div>
                  <div className="meta">
                    <p>{formatExperienceDate(experience.dateTime)}</p>
                    <p>{experience.location}</p>
                    <p>{experience.hostName}{experience.hostTitle ? ` · ${experience.hostTitle}` : ""}</p>
                  </div>
                  <p className="section-copy">{experience.description}</p>
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
                        : "Reserve My Spot"}
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
                      Request Cancellation
                    </button>
                  ) : null}
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
                </article>
              );
            })}
          </div>
          <p className="form-status" role="status">
            {message}
          </p>
        </div>
      </section>

      <section id="history" className="dashboard-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">My History</p>
              <h2 className="section-title">
                Your circle <em>over time.</em>
              </h2>
            </div>
            <p className="section-copy">
              Upcoming registrations, attended experiences, updates, and future
              payment or purchase references will live here.
            </p>
          </div>
          <div className="history-grid">
            <div className="history-column">
              <p className="eyebrow">Upcoming registrations</p>
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
                    <p className="section-copy">{reservation.experienceLocation}</p>
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
                <p className="section-copy">Your attended experiences will appear here.</p>
              )}
            </div>
            <div className="history-column">
              <p className="eyebrow">Future records</p>
              <article className="history-card muted-history-card">
                <h3>Payments</h3>
                <p className="section-copy">Payment references will appear here later.</p>
              </article>
              <article className="history-card muted-history-card">
                <h3>Products</h3>
                <p className="section-copy">Product purchases will appear here later.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="refer" className="section section--dark">
        <div className="wrap form-grid">
          <div>
            <p className="eyebrow on-dark">Referral by email</p>
            <h2 className="section-title">
              Invite someone <em>thoughtful.</em>
            </h2>
            <p className="hero-copy">
              Referrals are not public invites or viral links. Send a warm note to
              someone you believe would feel naturally aligned with this circle.
            </p>
          </div>
          <form className="form-panel" onSubmit={submitReferral}>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="referred_name">Name</label>
                <input id="referred_name" name="referred_name" className="input" required />
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
                <input id="relationship" name="relationship" className="input" required />
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
      </section>

      <section className="dashboard-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your referrals</p>
              <h2 className="section-title">
                Quiet <em>introductions.</em>
              </h2>
            </div>
          </div>
          <div className="stack">
            {referralState.length ? (
              referralState.map((referral) => (
                <article className="invite-card" key={referral.id}>
                  <div className="invite-card__top">
                    <div>
                      <h3>{referral.referredName}</h3>
                      <p className="section-copy">{referral.referredEmail}</p>
                    </div>
                    <span className="status-pill">{referral.status}</span>
                  </div>
                  <p className="microcopy">{referral.relationship}</p>
                </article>
              ))
            ) : (
              <p className="section-copy">No referrals sent yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="feedback">
        <div className="wrap form-grid">
          <div>
            <p className="eyebrow">Member notes</p>
            <h2 className="section-title">
              Feedback, kept <em>personal.</em>
            </h2>
            <p className="section-copy">
              Send experience feedback, product thoughts, technical issues,
              suggestions, or a general message to the team.
            </p>
          </div>
          <form className="form-panel" onSubmit={submitFeedback}>
            <div className="field-grid">
              <label className="field">
                <span>Category</span>
                <select name="category" className="input" defaultValue="GENERAL_MESSAGE">
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
        <div className="wrap feedback-thread-list">
          {feedbackState.length ? (
            feedbackState.map((thread) => (
              <article className="invite-card" key={thread.id}>
                <div className="invite-card__top">
                  <div>
                    <p className="eyebrow">{thread.category.replace(/_/g, " ")}</p>
                    <h3>{thread.subject}</h3>
                  </div>
                  <span className="status-pill">{thread.status.replace(/_/g, " ")}</span>
                </div>
                {thread.messages.map((item) => (
                  <p className="section-copy" key={item.id}>
                    {item.isAdmin ? "The Curated Life: " : "You: "}
                    {item.message}
                  </p>
                ))}
              </article>
            ))
          ) : null}
        </div>
      </section>

      {cancellationTarget ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Request cancellation">
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
