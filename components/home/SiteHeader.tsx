import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="The Curated Life home">
          <Image
            src="/images/curated-life/the-curated-life-logo.png"
            alt="The Curated Life"
            width={300}
            height={104}
            priority
            className="wordmark__logo"
          />
        </Link>
        <nav className="header-nav" aria-label="Primary navigation">
          <Link href="/#experiences">Experiences</Link>
          <Link href="/#access">Access</Link>
          <Link href="/login">Member Login</Link>
        </nav>
        <div className="header-actions">
          <Link href="/login" className="header-login">
            Login
          </Link>
          <Link href="/request-access" className="header-action">
            Request Access
          </Link>
        </div>
      </div>
    </header>
  );
}
