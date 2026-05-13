import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";

export default function ForgotPasswordPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="form-page">
        <div className="wrap form-grid">
          <aside className="dark-panel">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Forgot password</p>
              <h1 className="section-title">
                We will send a quiet <em>reset note.</em>
              </h1>
              <p className="hero-copy">
                For privacy, we show the same confirmation whether or not an email is
                found.
              </p>
              <div className="cta-row">
                <Link className="btn btn--ghost-light" href="/login">
                  Back to Login <span className="arrow" />
                </Link>
              </div>
            </div>
          </aside>
          <ForgotPasswordForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
