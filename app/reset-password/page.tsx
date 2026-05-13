import Link from "next/link";
import { PasswordTokenForm } from "@/components/forms/PasswordTokenForm";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getValidPasswordResetToken } from "@/lib/auth/password";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const tokenRecord = params.token
    ? await getValidPasswordResetToken(params.token)
    : null;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="form-page">
        <div className="wrap form-grid">
          <aside className="dark-panel">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Password reset</p>
              <h1 className="section-title">
                Choose a new <em>password.</em>
              </h1>
              <p className="hero-copy">
                Reset links are private, time-limited, and single-use.
              </p>
            </div>
          </aside>
          {tokenRecord && params.token ? (
            <PasswordTokenForm
              token={params.token}
              email={tokenRecord.user.email}
              endpoint="/api/auth/reset-password"
              submitLabel="Reset Password"
            />
          ) : (
            <div className="form-panel">
              <div className="field-grid">
                <p className="eyebrow">Link expired</p>
                <h2 className="section-title">
                  This reset link is no longer <em>valid.</em>
                </h2>
                <p className="section-copy">
                  You can request a fresh reset link from the password reset page.
                </p>
                <Link className="btn btn--ink btn--full" href="/forgot-password">
                  Request Reset <span className="arrow" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
