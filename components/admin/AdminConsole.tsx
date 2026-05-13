"use client";

import { useState, type FormEvent } from "react";
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
};

type ReservationView = {
  id: string;
  status: string;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  experienceTitle: string;
};

type ReferralView = {
  id: string;
  referredName: string;
  referredEmail: string;
  relationship: string;
  status: string;
  referrerName: string;
};

type AdminConsoleProps = {
  requests: AccessRequestView[];
  experiences: ExperienceView[];
  reservations: ReservationView[];
  referrals: ReferralView[];
};

export function AdminConsole({
  requests,
  experiences,
  reservations,
  referrals,
}: AdminConsoleProps) {
  const [requestState, setRequestState] = useState(requests);
  const [experienceState, setExperienceState] = useState(experiences);
  const [message, setMessage] = useState("");

  async function reviewRequest(id: string, action: "approve" | "decline" | "waitlist") {
    setMessage("");

    const response = await fetch(`/api/admin/access-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update access request.");
      return;
    }

    setRequestState((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status: payload.status } : request,
      ),
    );
    setMessage("Access request updated.");
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

  async function updateHost(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await updateExperience(id, {
      hostedByLabel: String(formData.get("hostedByLabel") ?? ""),
      hostName: String(formData.get("hostName") ?? ""),
      hostTitle: String(formData.get("hostTitle") ?? ""),
      hostBio: String(formData.get("hostBio") ?? ""),
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
      isVisible: true,
      isInviteOnly: true,
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

    setExperienceState((current) => [...current, body.experience]);
    event.currentTarget.reset();
    setMessage("Experience created.");
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
              Review access, manage hosts and experiences, and watch reservations
              without turning launch into an open marketplace.
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
                <p className="eyebrow">Access requests</p>
                <h2 className="panel-title">Review applications</h2>
              </div>
              <span className="status-pill">{requestState.length}</span>
            </div>
            <div className="admin-table">
              {requestState.length ? (
                requestState.map((request) => (
                  <article className="admin-row" key={request.id}>
                    <div>
                      <h3>{request.fullName}</h3>
                      <p className="section-copy">{request.email} · {request.phone}</p>
                      <p className="microcopy">Status: {request.status}</p>
                      <p className="section-copy">{request.message}</p>
                      <p className="microcopy">
                        Interests: {request.interests.join(", ")}
                      </p>
                    </div>
                    <div className="admin-actions">
                      <button className="small-button bronze" onClick={() => reviewRequest(request.id, "approve")}>
                        Approve
                      </button>
                      <button className="small-button secondary" onClick={() => reviewRequest(request.id, "waitlist")}>
                        Waitlist
                      </button>
                      <button className="small-button secondary" onClick={() => reviewRequest(request.id, "decline")}>
                        Decline
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="section-copy">No access requests yet.</p>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Experiences</p>
                <h2 className="panel-title">Manage hosts</h2>
              </div>
              <span className="status-pill">{experienceState.length}</span>
            </div>
            <div className="admin-table">
              {experienceState.map((experience) => (
                <article className="admin-row" key={experience.id}>
                  <div>
                    <h3>{experience.title}</h3>
                    <p className="section-copy">
                      {formatExperienceDate(experience.dateTime)} · {experience.location}
                    </p>
                    <p className="microcopy">
                      {experience.isVisible ? "Visible" : "Hidden"} ·{" "}
                      {experience.isInviteOnly ? "Invite-only" : "Open invite"}
                    </p>
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
                      Toggle visibility
                    </button>
                    <button
                      className="small-button secondary"
                      onClick={() =>
                        updateExperience(experience.id, {
                          isInviteOnly: !experience.isInviteOnly,
                        })
                      }
                    >
                      Toggle invite
                    </button>
                  </div>
                  <form className="field-grid" onSubmit={(event) => updateHost(event, experience.id)}>
                    <div className="field">
                      <label>Host label</label>
                      <input
                        name="hostedByLabel"
                        className="input"
                        defaultValue={experience.hostedByLabel}
                      />
                    </div>
                    <div className="field">
                      <label>Host name</label>
                      <input name="hostName" className="input" defaultValue={experience.hostName} />
                    </div>
                    <div className="field">
                      <label>Host title</label>
                      <input
                        name="hostTitle"
                        className="input"
                        defaultValue={experience.hostTitle ?? ""}
                      />
                    </div>
                    <div className="field">
                      <label>Host bio</label>
                      <textarea
                        name="hostBio"
                        className="textarea"
                        defaultValue={experience.hostBio ?? ""}
                      />
                    </div>
                    <button className="small-button bronze">Save host</button>
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div>
              <p className="eyebrow">New experience</p>
              <h2 className="panel-title">Add a gathering</h2>
            </div>
            <form className="field-grid" onSubmit={createExperience}>
              <div className="field">
                <label>Title</label>
                <input name="title" className="input" required />
              </div>
              <div className="field">
                <label>Slug</label>
                <input name="slug" className="input" required />
              </div>
              <div className="field">
                <label>Location</label>
                <input name="location" className="input" required />
              </div>
              <div className="field">
                <label>Date and time</label>
                <input name="dateTime" type="datetime-local" className="input" required />
              </div>
              <div className="field">
                <label>Image URL</label>
                <input name="imageUrl" className="input" required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea name="description" className="textarea" required />
              </div>
              <div className="field">
                <label>Hosted by label</label>
                <input name="hostedByLabel" className="input" required />
              </div>
              <div className="field">
                <label>Host name</label>
                <input name="hostName" className="input" required />
              </div>
              <div className="field">
                <label>Host title</label>
                <input name="hostTitle" className="input" />
              </div>
              <div className="field">
                <label>Host bio</label>
                <textarea name="hostBio" className="textarea" />
              </div>
              <div className="field">
                <label>Seats</label>
                <input name="seatsTotal" type="number" min="1" className="input" />
              </div>
              <button className="btn btn--ink btn--full">
                Create Experience <span className="arrow" />
              </button>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card__top">
              <div>
                <p className="eyebrow">Reservations</p>
                <h2 className="panel-title">Requests</h2>
              </div>
              <span className="status-pill">{reservations.length}</span>
            </div>
            <div className="admin-table">
              {reservations.length ? (
                reservations.map((reservation) => (
                  <article className="admin-row" key={reservation.id}>
                    <h3>{reservation.experienceTitle}</h3>
                    <p className="section-copy">
                      {reservation.memberName} · {reservation.memberEmail}
                    </p>
                    <p className="microcopy">{reservation.status}</p>
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
        </div>
      </div>
    </div>
  );
}
