export type CuratedExperience = {
  title: string;
  slug: string;
  imageUrl: string;
  location: string;
  dateTime: string;
  description: string;
  hostedByLabel: string;
  hostName: string;
  hostTitle?: string;
  hostBio?: string;
  seatsTotal?: number;
  isVisible: boolean;
  isInviteOnly: boolean;
};

export const curatedExperiences: CuratedExperience[] = [
  {
    title: "Sunrise Bicycling",
    slug: "sunrise-bicycling",
    imageUrl: "/images/curated-life/sunrise-bicycling-marine-drive.png",
    location: "Marine Drive Promenade, South Mumbai",
    dateTime: "2026-06-14T06:00:00.000+05:30",
    description:
      "A quiet ride along the sea before the city fully wakes, followed by tea, coffee, and a slow breakfast nearby.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Founder-led circle",
    hostBio:
      "A soft first gathering for members who prefer mornings, movement, and unhurried conversation.",
    seatsTotal: 12,
    isVisible: true,
    isInviteOnly: true,
  },
  {
    title: "Midnight Bicycling",
    slug: "midnight-bicycling",
    imageUrl: "/images/curated-life/midnight-bicycling-marine-drive.png",
    location: "Queen's Necklace, Marine Drive",
    dateTime: "2026-06-20T23:30:00.000+05:30",
    description:
      "A gentle late-night route around the lit curve of the bay, with pauses for coconut water, chai, and unhurried conversation.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Private host team",
    hostBio:
      "The route is paced for conversation, not speed, with pauses at a few much-loved corners.",
    seatsTotal: 10,
    isVisible: true,
    isInviteOnly: true,
  },
  {
    title: "Coffee & Conversations",
    slug: "coffee-conversations",
    imageUrl: "/images/curated-life/coffee-conversations-irani-cafe.png",
    location: "Ballard Estate, South Mumbai",
    dateTime: "2026-06-27T17:00:00.000+05:30",
    description:
      "An intimate table for warm introductions, thoughtful prompts, Irani chai, coffee, and fresh seasonal juice.",
    hostedByLabel: "Hosted by Zainab Contractor",
    hostName: "Zainab Contractor",
    hostTitle: "Trusted member host",
    hostBio:
      "Zainab hosts small rooms with a natural instinct for making strangers feel considered.",
    seatsTotal: 8,
    isVisible: true,
    isInviteOnly: true,
  },
  {
    title: "Trail Horse Riding",
    slug: "trail-horse-riding",
    imageUrl: "/images/curated-life/trail-horse-riding-matheran.png",
    location: "Matheran, near Mumbai",
    dateTime: "2026-07-05T07:00:00.000+05:30",
    description:
      "A composed morning on beginner-friendly hill-station trails with a trusted riding partner and a small group.",
    hostedByLabel: "Hosted by Armaan Stable Club",
    hostName: "Armaan Stable Club",
    hostTitle: "Partner host",
    hostBio:
      "A careful equestrian partner chosen for patient instruction, calm horses, and generous hospitality.",
    seatsTotal: 6,
    isVisible: true,
    isInviteOnly: true,
  },
  {
    title: "Bowling Evenings",
    slug: "bowling-evenings",
    imageUrl: "/images/curated-life/bowling-evening-juices.png",
    location: "Phoenix Marketcity, Kurla",
    dateTime: "2026-07-10T20:00:00.000+05:30",
    description:
      "A relaxed evening for easy laughter, gentle competition, and fresh juices after the final frame.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Founder-led circle",
    hostBio:
      "Designed as a low-pressure night for members who enjoy social energy in a contained room.",
    seatsTotal: 14,
    isVisible: true,
    isInviteOnly: true,
  },
];

export function formatExperienceDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
