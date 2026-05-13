"use client";

import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
    });

    const payload = await response.json();
    setMessage(
      payload.message ?? "If that email has access, a password reset link has been sent.",
    );
    setIsLoading(false);
  }

  return (
    <form className="form-panel" onSubmit={onSubmit}>
      <div className="field-grid">
        <p className="eyebrow">Password reset</p>
        <h1 className="section-title">
          Receive a private <em>reset link.</em>
        </h1>
        <p className="section-copy">
          Enter the email address connected to your approved access.
        </p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <button className="btn btn--ink btn--full" disabled={isLoading}>
          {isLoading ? "Sending" : "Send Reset Link"}
          <span className="arrow" />
        </button>
        <p className="form-status" role="status">
          {message}
        </p>
      </div>
    </form>
  );
}
