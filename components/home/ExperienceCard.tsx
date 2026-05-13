import Link from "next/link";
import type { CuratedExperience } from "@/lib/data/experiences";
import { formatExperienceDate } from "@/lib/data/experiences";

/* eslint-disable @next/next/no-img-element */

type ExperienceCardProps = {
  experience: CuratedExperience & { id?: string };
  actionHref?: string;
};

function availabilityLabel(experience: CuratedExperience) {
  if (experience.seatsTotal) return `${experience.seatsTotal} seats`;
  return experience.isInviteOnly ? "Invite-only" : "Open access";
}

export function ExperienceCard({ experience, actionHref = "/request-access" }: ExperienceCardProps) {
  return (
    <article className="experience-card">
      <div className="experience-card__image">
        <img
          src={experience.imageUrl}
          alt={`${experience.title} at ${experience.location}`}
          loading="lazy"
        />
      </div>
      <div className="experience-card__body">
        <div className="experience-card__line">
          <span className="experience-card__date">
            {formatExperienceDate(experience.dateTime)}
          </span>
          <span className="experience-card__status">{availabilityLabel(experience)}</span>
        </div>
        <h3>{experience.title}</h3>
        <p className="experience-card__meta">{experience.location}</p>
        <p className="experience-card__description">{experience.description}</p>
        <span className="host-chip">{experience.hostedByLabel}</span>
        {experience.hostTitle ? (
          <p className="microcopy experience-card__host">
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
