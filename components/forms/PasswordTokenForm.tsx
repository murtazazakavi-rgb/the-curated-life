"use client";

import { useState, type FormEvent } from "react";

type PasswordTokenFormProps = {
  token: string;
  email?: string;
  endpoint: "/api/auth/set-password" | "/api/auth/reset-password";
  submitLabel: string;
};

export function PasswordTokenForm({
  token,
  email,
  endpoint,
  submitLabel,
}: PasswordTokenFormProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Could not update password.");
      setIsLoading(false);
      return;
    }

    window.location.href = payload.redirectTo ?? "/login?status=password-reset";
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="field-grid">
        <p className="eyebrow">Private access</p>
        <h1 className="section-title">
          Choose your <em>password.</em>
        </h1>
        {email ? (
          <div className="field">
            <label>Email</label>
            <input className="input" value={email} readOnly />
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            className="input"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            className="input"
            required
          />
        </div>
        <button className="btn btn--ink btn--full" disabled={isLoading}>
          {isLoading ? "Saving" : submitLabel}
          <span className="arrow" />
        </button>
        <p className="form-status" role="status">
          {message}
        </p>
      </div>
    </form>
  );
}
