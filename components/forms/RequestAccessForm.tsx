"use client";

import { useState, type FormEvent } from "react";
import {
  experiencePreferenceOptions,
  interestOptions,
} from "@/lib/validators/access";

type RequestAccessFormProps = {
  defaultReferredBy?: string;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function RequestAccessForm({ defaultReferredBy = "" }: RequestAccessFormProps) {
  const [status, setStatus] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [interests, setInterests] = useState<string[]>(["Conversations"]);
  const [preferredExperiences, setPreferredExperiences] = useState<string[]>([
    "Coffee & Conversations",
  ]);

  function toggle(list: string[], value: string, setter: (next: string[]) => void) {
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      full_name: String(formData.get("full_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      referred_by: String(formData.get("referred_by") ?? ""),
      interests,
      preferred_experiences: preferredExperiences,
      message: String(formData.get("message") ?? ""),
    };

    const response = await fetch("/api/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatus("error");
      setMessage("Please review the details and try again.");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="success-panel">
        <p className="eyebrow">Request received</p>
        <h2 className="section-title">
          We will review it <em>personally.</em>
        </h2>
        <p className="section-copy">
          Thank you for writing to The Curated Life. We have sent a quiet note to
          confirm receipt, and we will follow up by email if access is granted.
        </p>
      </div>
    );
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" name="full_name" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" name="phone" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="referred_by">Referred by</label>
          <input
            id="referred_by"
            name="referred_by"
            className="input"
            defaultValue={defaultReferredBy}
            placeholder="Name, email, or how you found us"
          />
        </div>

        <fieldset className="field choice-grid">
          <legend>Interests</legend>
          {interestOptions.map((option) => (
            <label className="choice" key={option}>
              <input
                type="checkbox"
                checked={interests.includes(option)}
                onChange={() => toggle(interests, option, setInterests)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>

        <fieldset className="field choice-grid">
          <legend>Preferred experiences</legend>
          {experiencePreferenceOptions.map((option) => (
            <label className="choice" key={option}>
              <input
                type="checkbox"
                checked={preferredExperiences.includes(option)}
                onChange={() =>
                  toggle(preferredExperiences, option, setPreferredExperiences)
                }
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="message">
            What kind of experiences are you hoping to find here?
          </label>
          <textarea
            id="message"
            name="message"
            className="textarea"
            required
            minLength={12}
          />
        </div>

        <button className="btn btn--ink btn--full" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending request" : "Send Request"}
          <span className="arrow" />
        </button>
        <p className="form-status" role="status">
          {message}
        </p>
      </div>
    </form>
  );
}
