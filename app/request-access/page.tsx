import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { RequestAccessForm } from "@/components/forms/RequestAccessForm";

type RequestAccessPageProps = {
  searchParams: Promise<{
    referred_by?: string;
  }>;
};

export default async function RequestAccessPage({
  searchParams,
}: RequestAccessPageProps) {
  const params = await searchParams;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="form-page">
        <div className="wrap form-grid">
          <aside className="dark-panel">
            <div className="dark-panel__inner">
              <p className="eyebrow on-dark">Request access</p>
              <h1 className="section-title">
                Tell us what you hope to <em>find here.</em>
              </h1>
              <p className="hero-copy">
                This is intentionally personal. We are looking for thoughtful fit,
                not a polished application. A few honest lines are enough.
              </p>
            </div>
          </aside>
          <RequestAccessForm defaultReferredBy={params.referred_by ?? ""} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
