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
      <main className="form-page login-page">
        <div className="wrap login-wrap">
          <LoginPanel status={params.status} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
