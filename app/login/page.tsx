import Link from "next/link";
import { LoginPanel } from "@/components/forms/LoginPanel";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";

type LoginPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="form-page">
        <div className="wrap form-grid">
          <aside className="dark-panel">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Member login</p>
              <h1 className="section-title">
                Access is granted <em>before login.</em>
              </h1>
              <p className="hero-copy">
                If you have not yet been approved, please request access first.
                The circle opens only after a manual invitation.
              </p>
              <div className="cta-row">
                <Link className="btn btn--ghost-light" href="/request-access">
                  Request Access <span className="arrow" />
                </Link>
              </div>
            </div>
          </aside>
          <LoginPanel status={params.status} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
