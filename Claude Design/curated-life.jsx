/* The Curated Life — member view (mobile-first, animated)
 * Single-page prototype. Palette + layout variant exposed via Tweaks.
 */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#F5F1EA", "#10140F", "#A07C5B"],
  "variant": "soft",
  "memberName": "Reference Verified",
  "memberPhoto": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=facearea&facepad=2.6&w=240&h=240&q=80",
  "memberEmail": "reference@curatedlife.in"
}/*EDITMODE-END*/;

const PALETTES = {
  warm:   ["#F5F1EA", "#10140F", "#A07C5B"],
  deeper: ["#EBE2D2", "#1E160F", "#7A4E2B"],
  cooler: ["#E9EAE3", "#1F2A26", "#6B7A6F"],
};

function applyPalette([cream, ink, muted]) {
  const root = document.body;
  const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  root.style.setProperty("--cream", cream);
  root.style.setProperty("--cream-2", mix(cream, ink, 88));
  root.style.setProperty("--cream-3", mix(cream, "#ffffff", 60));
  root.style.setProperty("--ink", ink);
  root.style.setProperty("--ink-soft", mix(ink, cream, 75));
  root.style.setProperty("--muted", muted);
  root.style.setProperty("--sub", mix(ink, cream, 70));
  root.style.setProperty("--on-dark", cream);
  root.style.setProperty("--on-dark-soft", mix(cream, ink, 75));
}

const MEMBER_INVITES = [
  {
    title: "Sunrise Bicycling",
    date: "Sunday, 16 June",
    time: "6:00 AM",
    location: "Marine Drive, Mumbai",
    host: "Hosted by The Curated Life",
    status: "Invitation open",
  },
  {
    title: "Coffee & Conversations",
    date: "Saturday, 22 June",
    time: "5:00 PM",
    location: "Bandra, Mumbai",
    host: "Hosted by Zainab Contractor",
    status: "Few seats left",
  },
];

const EXPERIENCES = [
  {
    title: "Sunrise Bicycling",
    location: "Marine Drive, Mumbai",
    time: "Sunday · 6:00 AM",
    host: "Hosted by The Curated Life",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Coffee & Conversations",
    location: "Bandra, Mumbai",
    time: "Saturday · 5:00 PM",
    host: "Hosted by Zainab Contractor",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Trail Horse Riding",
    location: "Near Mumbai",
    time: "Limited Seats",
    host: "Hosted by Armaan Stable Club",
    image: "https://images.unsplash.com/photo-1534773728080-33d31da27ae5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Bowling Evening",
    location: "Mumbai",
    time: "Friday · 8:00 PM",
    host: "Hosted by The Curated Life",
    image: "https://images.unsplash.com/photo-1538511059256-46e15bfbf3ff?auto=format&fit=crop&w=1200&q=80",
  },
];

const STEPS = [
  ["01", "Confirm your place",        "Reserve your seat for the experience you want to attend."],
  ["02", "Receive details",           "You’ll get timing, location, dress code and reminders by email."],
  ["03", "Arrive personally welcomed","Your name will be on the guest list and the host will know to expect you."],
];

const MARQUEE_ITEMS = [
  "Private invitations",
  "Personally reviewed",
  "Small, selective gatherings",
  "Reference-only entry",
  "Quiet correspondence",
];

/* ── animation helpers ───────────────────────────────────── */

// Reveal on scroll. Adds .in once visible.
function useReveal() {
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll("[data-reveal], [data-reveal-group] > *").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// Split a phrase into per-word spans with staggered delays for hero reveal.
function SplitWords({ text, baseDelay = 0, step = 90 }) {
  const parts = String(text).split(/(\s+)/); // keep spaces
  let wordIndex = 0;
  return parts.map((p, i) => {
    if (/^\s+$/.test(p)) return <span key={i}>{p}</span>;
    const delay = baseDelay + wordIndex * step;
    wordIndex += 1;
    return (
      <span className="word" key={i}>
        <span style={{ "--word-delay": `${delay}ms` }}>{p}</span>
      </span>
    );
  });
}

// 3D tilt for the member card (pointer-based, desktop only).
function useTilt(ref, { max = 6 } = {}) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch devices
    let raf = 0, tx = 0, ty = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tx = -y * max; ty = x * max;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const apply = () => {
      el.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg)`;
      raf = 0;
    };
    const onLeave = () => { el.style.transform = ""; };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* ── components ──────────────────────────────────────────── */

function Header() {
  return (
    <header className="site-header" data-screen-label="Header">
      <div className="site-header__inner">
        <div className="wordmark">
          <span className="wordmark__seal"><em>c</em></span>
          THE CURATED LIFE
        </div>
        <div className="access-pill">Access Granted</div>
      </div>
    </header>
  );
}

function Welcome({ memberName, memberPhoto }) {
  const cardRef = React.useRef(null);
  useTilt(cardRef, { max: 5 });

  return (
    <section className="hero" data-screen-label="Welcome">
      <div className="wrap">
        <div className="hero__grid">
          <div className="welcome">
            <span className="welcome__aurora" aria-hidden="true"></span>
            <span className="welcome__monogram" aria-hidden="true">C</span>
            <p className="eyebrow on-dark" data-reveal style={{ "--reveal-delay": "200ms" }}>Welcome to the circle</p>
            <h1>
              <SplitWords text="Your access" baseDelay={400} step={80} />
              <br />
              <em><SplitWords text="has been granted." baseDelay={760} step={70} /></em>
            </h1>
            <p className="lead" data-reveal style={{ "--reveal-delay": "1100ms" }}>
              You can now view private invitations, reserve your place for selected
              experiences, and receive thoughtful updates through email.
            </p>
            <div className="cta-row" data-reveal style={{ "--reveal-delay": "1300ms" }}>
              <button className="btn btn--cream">
                View Invitations <span className="arrow"></span>
              </button>
              <button className="btn btn--ghost-light">
                Refer a Friend <span className="arrow"></span>
              </button>
            </div>
          </div>

          <aside className="mcard-frame" aria-label="Member card" data-reveal style={{ "--reveal-delay": "300ms" }}>
            <div className="mcard-frame__head">
              <p className="eyebrow">Member Card</p>
              <span className="mcard-frame__num">Nº 037</span>
            </div>
            <div className="mcard" ref={cardRef}>
              <p className="mcard__brand">The Curated <em>Life</em></p>
              <div className="mcard__id">
                <div className="mcard__avatar">
                  {memberPhoto
                    ? <img src={memberPhoto} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    : <span className="mcard__avatar-initials">{(memberName || '').trim().split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase() || 'C'}</span>}
                  <span className="mcard__google" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.604 4.604 0 0 1-1.996 3.022v2.51h3.232c1.89-1.741 2.982-4.305 2.982-7.355z"/><path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.418l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.404 13.904A5.97 5.97 0 0 1 6.09 12c0-.66.114-1.302.314-1.904V7.506H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.064 4.494l3.34-2.59z"/><path fill="#EA4335" d="M12 5.973c1.47 0 2.787.505 3.823 1.496l2.866-2.866C16.96 2.99 14.696 2 12 2 8.087 2 4.71 4.244 3.064 7.506l3.34 2.59C7.19 7.733 9.395 5.973 12 5.973z"/></svg>
                  </span>
                </div>
                <div className="mcard__id-text">
                  <p className="eyebrow on-dark tight">Access Holder</p>
                  <p className="mcard__name">{memberName}</p>
                  <p className="mcard__verified">Verified via Google</p>
                </div>
              </div>
              <div className="mcard__footer">
                <span>Private invitations</span>
                <span>Email updates</span>
                <span>Select gatherings</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  // Duplicate items so the -50% translate loop is seamless.
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {items.map((m, i) => (
          <span className="marquee__item" key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function InviteCard({ invite, idx }) {
  return (
    <article className="invite-card" data-reveal style={{ "--reveal-delay": `${idx * 120}ms` }}>
      <div className="invite-card__top">
        <div>
          <p className="eyebrow tight">{invite.status}</p>
          <h3>{invite.title}</h3>
        </div>
        <span className="badge">Invite</span>
      </div>
      <div className="meta">
        <p>{invite.date} · {invite.time}</p>
        <p>{invite.location}</p>
        <p>{invite.host}</p>
      </div>
      <div className="invite-card__actions">
        <button className="btn btn--ink">Reserve Place <span className="arrow"></span></button>
        <button className="btn btn--ghost">View Details</button>
      </div>
      <div className="refer">
        <p className="eyebrow tight">Invite Someone</p>
        <p>
          Members can refer friends or family they believe would align with the
          spirit of the circle.
        </p>
        <button className="btn btn--ghost">Send Invitation Email <span className="arrow"></span></button>
      </div>
    </article>
  );
}

function Invitations() {
  return (
    <section className="section" data-screen-label="Private Invitations">
      <div className="wrap">
        <div className="section-head">
          <div data-reveal>
            <p className="eyebrow">Private Invitations</p>
            <h2>Available <em>to you.</em></h2>
          </div>
          <p data-reveal style={{ "--reveal-delay": "120ms" }}>
            These experiences are visible only after your request has been approved.
          </p>
        </div>
        <div className="invite-grid">
          {MEMBER_INVITES.map((inv, i) => <InviteCard key={inv.title} invite={inv} idx={i} />)}
        </div>
      </div>
    </section>
  );
}

function Experiences() {
  return (
    <section className="section--dark" data-screen-label="Experiences">
      <div className="wrap">
        <div className="section-head">
          <div data-reveal>
            <p className="eyebrow on-dark">Upcoming</p>
            <h2><em>Experiences.</em></h2>
          </div>
          <p data-reveal style={{ "--reveal-delay": "120ms" }}>
            Small, selective gatherings around Mumbai and nearby destinations.
          </p>
        </div>
        <div className="exp-grid">
          {EXPERIENCES.map((x, i) => (
            <article className="exp" key={x.title} data-reveal style={{ "--reveal-delay": `${i * 110}ms` }}>
              <div className="exp__img-wrap">
                <img src={x.image} alt={x.title} loading="lazy" />
                <span className="exp__time">{x.time}</span>
              </div>
              <div className="exp__body">
                <h3>{x.title}</h3>
                <p className="exp__loc">{x.location}</p>
                <span className="exp__host">{x.host}</span>
                <button className="exp__cta">Request Invite <span className="arrow"></span></button>
              </div>
            </article>
          ))}
        </div>
        <p className="exp-hint" aria-hidden="true">
          Swipe to browse <span className="exp-hint__icon"></span>
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="section--dark" data-screen-label="How it works"
      style={{ borderTop: "1px solid var(--line-on-dark)" }}>
      <div className="wrap">
        <div className="steps">
          {STEPS.map(([n, t, d], i) => (
            <div className="step" key={n} data-reveal style={{ "--reveal-delay": `${i * 160}ms` }}>
              <p className="step__num">{n}</p>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionBar() {
  // Sticky mobile-only action bar. Hidden on tablet+ via CSS.
  return (
    <div className="actionbar" role="region" aria-label="Quick actions">
      <button className="btn btn--ink">Invitations <span className="arrow"></span></button>
      <button className="btn btn--ghost">Refer</button>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div>
          THE CURATED LIFE
          <span className="dot"></span>
          Mumbai
        </div>
        <div>Reference-only · Personally reviewed</div>
      </div>
    </footer>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => { applyPalette(t.palette); }, [t.palette]);
  React.useEffect(() => { document.body.setAttribute("data-variant", t.variant); }, [t.variant]);

  // trigger initial load animations (hero word reveal etc.) on next frame
  React.useEffect(() => {
    const id = requestAnimationFrame(() => document.body.classList.add("loaded"));
    return () => cancelAnimationFrame(id);
  }, []);

  useReveal();

  return (
    <>
      <Header />
      <main>
        <Welcome memberName={t.memberName} memberPhoto={t.memberPhoto} />
        <Marquee />
        <Invitations />
        <Experiences />
        <HowItWorks />
      </main>
      <Footer />
      <ActionBar />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <TweakColor
          label="Palette"
          value={t.palette}
          options={[PALETTES.warm, PALETTES.deeper, PALETTES.cooler]}
          onChange={(v) => setTweak("palette", v)}
        />

        <TweakSection label="Layout & type" />
        <TweakRadio
          label="Variant"
          value={t.variant}
          options={["soft", "editorial", "modern"]}
          onChange={(v) => setTweak("variant", v)}
        />

        <TweakSection label="Content" />
        <TweakText
          label="Member name"
          value={t.memberName}
          onChange={(v) => setTweak("memberName", v)}
        />
        <TweakText
          label="Member photo URL"
          value={t.memberPhoto}
          onChange={(v) => setTweak("memberPhoto", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
