"use client";

import { useMemo, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
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
};

type ReservationView = {
  id: string;
  experienceId: string;
  status: string;
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
};

export function MemberDashboard({
  member,
  experiences,
  reservations,
  referrals,
}: MemberDashboardProps) {
  const [reservationState, setReservationState] = useState(reservations);
  const [referralState, setReferralState] = useState(referrals);
  const [message, setMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  const reservationsByExperience = useMemo(() => {
    return new Map(
      reservationState.map((reservation) => [
        reservation.experienceId,
        reservation.status,
      ]),
    );
  }, [reservationState]);

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
      const existing = current.filter(
        (reservation) => reservation.experienceId !== payload.reservation.experienceId,
      );
      return [...existing, payload.reservation];
    });
    setMessage("Reservation request received.");
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

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
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
                Access holder · Verified by Google · Private invitations
              </p>
              <button className="btn btn--cream btn--full" type="button" onClick={signOut}>
                Sign Out
              </button>
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
              const reservationStatus = reservationsByExperience.get(experience.id);

              return (
                <article className="invite-card" key={experience.id}>
                  <div className="invite-card__top">
                    <div>
                      <p className="eyebrow">{experience.hostedByLabel}</p>
                      <h3>{experience.title}</h3>
                    </div>
                    <span className="status-pill">
                      {reservationStatus ?? "Invitation open"}
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
                    {reservationStatus ? "Request Received" : "Reserve Place"}
                    <span className="arrow" />
                  </button>
                </article>
              );
            })}
          </div>
          <p className="form-status" role="status">
            {message}
          </p>
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
    </>
  );
}
