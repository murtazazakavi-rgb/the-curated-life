"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type LoginPanelProps = {
  status?: string;
};

export function LoginPanel({ status }: LoginPanelProps) {
  const [message, setMessage] = useState(
    status === "not-granted"
      ? "Access has not yet been granted."
      : status === "password-reset"
        ? "Your password has been updated."
        : "",
  );
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not log in.");
      setIsLoading(false);
      return;
    }

    window.location.href = payload.redirectTo ?? "/member";
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="field-grid">
        <p className="eyebrow">Approved members</p>
        <h1 className="section-title">
          Enter with <em>email.</em>
        </h1>
        <p className="section-copy">
          Use the email address that was approved for The Curated Life.
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            minLength={8}
            required
          />
        </div>
        <button className="btn btn--ink btn--full" disabled={isLoading}>
          {isLoading ? "Entering" : "Login"}
          <span className="arrow" />
        </button>
        <div className="cta-row" style={{ marginTop: 0 }}>
          <Link className="microcopy" href="/forgot-password">
            Forgot password?
          </Link>
          <Link className="microcopy" href="/request-access">
            Request access
          </Link>
        </div>
        <p className="form-status" role="status">
          {message}
        </p>
      </div>
    </form>
  );
}
