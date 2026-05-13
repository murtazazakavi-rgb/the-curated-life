"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type LoginPanelProps = {
  status?: string;
};

export function LoginPanel({ status }: LoginPanelProps) {
  const [message, setMessage] = useState(
    status === "not-granted" ? "Access has not yet been granted." : "",
  );
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setIsLoading(true);
    setMessage("");

    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/member",
        errorCallbackURL: "/login?status=not-granted",
      },
      {
        onError: () => {
          setMessage("Access has not yet been granted.");
          setIsLoading(false);
        },
      },
    );
  }

  return (
    <div className="form-panel">
      <div className="field-grid">
        <p className="eyebrow">Approved members</p>
        <h1 className="section-title">
          Enter with <em>Google.</em>
        </h1>
        <p className="section-copy">
          Google verifies identity, but it does not grant access by itself. Only
          approved member emails can open the private dashboard.
        </p>
        <button
          type="button"
          className="btn btn--ink btn--full"
          onClick={signInWithGoogle}
          disabled={isLoading}
        >
          {isLoading ? "Opening Google" : "Continue with Google"}
          <span className="arrow" />
        </button>
        <p className="form-status" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}
