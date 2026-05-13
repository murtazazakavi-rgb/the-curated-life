import Link from "next/link";
import type { CSSProperties } from "react";
import { ExperienceCard } from "@/components/home/ExperienceCard";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { curatedExperiences } from "@/lib/data/experiences";
import { getPrisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const experiences = process.env.DATABASE_URL
    ? await getPrisma().experience.findMany({
        where: {
          isVisible: true,
          isArchived: false,
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: "asc" },
      })
    : curatedExperiences
        .filter(
          (experience) =>
            experience.isVisible && new Date(experience.dateTime) >= new Date(),
        )
        .sort(
          (first, second) =>
            new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime(),
        );

  const marqueeItems = [
    "Private invitations",
    "Personally reviewed",
    "Small selective gatherings",
    "Reference-only entry",
    "Quiet correspondence",
  ];
  const marquee = [...marqueeItems, ...marqueeItems];

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="hero-public">
          <div
            className="hero-public__image"
            style={{
              "--hero-image":
                "url('/images/curated-life/hero-bandra-worli-sunset.png')",
            } as CSSProperties}
          />
          <div className="hero-public__content">
            <p className="eyebrow on-dark">Reference-only lifestyle experiences</p>
            <h1 className="display-title">
              The Curated <em>Life</em>
            </h1>
            <p className="hero-copy">
              A private curated circle for intimate mornings, thoughtful evenings,
              real Mumbai places, trusted hosts, and introductions that feel
              considered rather than crowded.
            </p>
            <div className="cta-row">
              <Link className="btn btn--cream" href="/request-access">
                Request Access <span className="arrow" />
              </Link>
              <Link className="btn btn--ghost-light" href="#experiences">
                View Experiences <span className="arrow" />
              </Link>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {marquee.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        </div>

        <section className="section" aria-labelledby="positioning">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">Reference-only</p>
                <h2 id="positioning" className="section-title">
                  Access is <em>personal.</em>
                </h2>
              </div>
              <p className="section-copy">
                The Curated Life is not an open booking platform. People apply first,
                every request is reviewed personally, and access is granted manually so
                each room can stay warm, intentional, and human in scale.
              </p>
            </div>
            <div className="editorial-grid">
              <article className="editorial-note">
                <h3>Small by design</h3>
                <p>
                  Experiences are intimate, paced, and curated around the people in the
                  room instead of around volume.
                </p>
              </article>
              <article className="editorial-note">
                <h3>Trusted hosts</h3>
                <p>
                  Some gatherings are founder-led. Others are hosted by thoughtful
                  members or partner hosts we personally trust.
                </p>
              </article>
              <article className="editorial-note">
                <h3>Quiet correspondence</h3>
                <p>
                  Invitations, confirmations, and details arrive by email. No public
                  checkout, no noisy feeds, no launch-day clutter.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="experiences" className="section section--dark" aria-labelledby="experiences-title">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow on-dark">Upcoming</p>
                <h2 id="experiences-title" className="section-title">
                  Experiences <em>in view.</em>
                </h2>
              </div>
              <p className="section-copy">
                A small launch calendar across movement, conversation, and easy social
                evenings around Mumbai and nearby places.
              </p>
            </div>
            <div className="experience-grid">
              {experiences.length ? (
                experiences.map((experience) => (
                  <ExperienceCard
                    key={experience.slug}
                    experience={{
                      ...experience,
                      dateTime:
                        typeof experience.dateTime === "string"
                          ? experience.dateTime
                          : experience.dateTime.toISOString(),
                      hostTitle: experience.hostTitle ?? undefined,
                      hostBio: experience.hostBio ?? undefined,
                      seatsTotal: experience.seatsTotal ?? undefined,
                    }}
                  />
                ))
              ) : (
                <article className="editorial-note" style={{ gridColumn: "1 / -1" }}>
                  <h3>New invitations are being composed.</h3>
                  <p>
                    The next visible experiences will appear here once the calendar is
                    ready for approved members and new applicants to review.
                  </p>
                </article>
              )}
            </div>
          </div>
        </section>

        <section id="access" className="section" aria-labelledby="access-title">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">How access works</p>
                <h2 id="access-title" className="section-title">
                  Apply first. <em>Enter gently.</em>
                </h2>
              </div>
            </div>
            <div className="step-grid">
              <article className="step">
                <p className="step__num">01</p>
                <h3>Request access</h3>
                <p>
                  Share who you are, how you were referred, and the kinds of experiences
                  you hope to find here.
                </p>
              </article>
              <article className="step">
                <p className="step__num">02</p>
                <h3>Personally reviewed</h3>
                <p>
                  Requests are reviewed manually. If there is a natural fit, access is
                  granted and an invitation email is sent.
                </p>
              </article>
              <article className="step">
                <p className="step__num">03</p>
                <h3>Member entry</h3>
                <p>
                  Approved members log in with email and password, view private
                  invitations, reserve places, and refer thoughtful people by email.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section request-band" aria-labelledby="request-title">
          <div className="wrap">
            <p className="eyebrow on-dark">Private circle</p>
            <h2 id="request-title" className="section-title">
              Request an <em>invitation.</em>
            </h2>
            <p className="hero-copy">
              Tell us what kind of experiences you are hoping to find here. The first
              circle is intentionally selective and reviewed with care.
            </p>
            <div className="cta-row">
              <Link className="btn btn--cream" href="/request-access">
                Begin Request <span className="arrow" />
              </Link>
              <Link className="btn btn--ghost-light" href="/login">
                Approved Member Login <span className="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
