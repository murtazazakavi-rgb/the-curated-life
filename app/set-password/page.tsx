import Link from "next/link";
import { PasswordTokenForm } from "@/components/forms/PasswordTokenForm";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { getValidPasswordSetupToken } from "@/lib/auth/password";

type SetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const params = await searchParams;
  const tokenRecord = params.token
    ? await getValidPasswordSetupToken(params.token)
    : null;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="form-page">
        <div className="wrap form-grid">
          <aside className="dark-panel">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Access granted</p>
              <h1 className="section-title">
                Set your private <em>entry key.</em>
              </h1>
              <p className="hero-copy">
                This link can only be used once. After your password is saved, you
                will enter with email and password.
              </p>
            </div>
          </aside>
          {tokenRecord && params.token ? (
            <PasswordTokenForm
              token={params.token}
              email={tokenRecord.user.email}
              endpoint="/api/auth/set-password"
              submitLabel="Set Password"
            />
          ) : (
            <div className="form-panel">
              <div className="field-grid">
                <p className="eyebrow">Link expired</p>
                <h2 className="section-title">
                  This setup link is no longer <em>valid.</em>
                </h2>
                <p className="section-copy">
                  Please use the newest setup email, or request a password reset if
                  your access has already been approved.
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
