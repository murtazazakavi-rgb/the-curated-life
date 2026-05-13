import Link from "next/link";
import type { CuratedExperience } from "@/lib/data/experiences";
import { formatExperienceDate } from "@/lib/data/experiences";

/* eslint-disable @next/next/no-img-element */

type ExperienceCardProps = {
  experience: CuratedExperience & { id?: string };
  actionHref?: string;
};

export function ExperienceCard({ experience, actionHref = "/request-access" }: ExperienceCardProps) {
  return (
    <article className="experience-card">
      <div className="experience-card__image">
        <img
          src={experience.imageUrl}
          alt={`${experience.title} at ${experience.location}`}
          loading="lazy"
        />
        <span className="experience-card__date">
          {formatExperienceDate(experience.dateTime)}
        </span>
      </div>
      <div className="experience-card__body">
        <p className="experience-card__meta">{experience.location}</p>
        <h3>{experience.title}</h3>
        <p className="experience-card__description">{experience.description}</p>
        <span className="host-chip">{experience.hostedByLabel}</span>
        {experience.hostTitle ? (
          <p className="microcopy" style={{ color: "rgba(15,15,15,.52)", margin: 0 }}>
            {experience.hostName} · {experience.hostTitle}
          </p>
        ) : null}
        <Link className="btn btn--ghost btn--full" href={actionHref}>
          Request Invite <span className="arrow" />
        </Link>
      </div>
    </article>
  );
}
