import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const db = neon(connectionString);

const experiences = [
  {
    id: "exp_sunrise_bicycling",
    title: "Sunrise Bicycling",
    slug: "sunrise-bicycling",
    imageUrl: "/images/curated-life/sunrise-bicycling-marine-drive.png",
    location: "Marine Drive Promenade, South Mumbai",
    dateTime: "2026-06-14 06:00:00.000",
    description:
      "A quiet ride along the sea before the city fully wakes, followed by tea, coffee, and a slow breakfast nearby.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Founder-led circle",
    hostBio:
      "A soft first gathering for members who prefer mornings, movement, and unhurried conversation.",
    seatsTotal: 12,
  },
  {
    id: "exp_midnight_bicycling",
    title: "Midnight Bicycling",
    slug: "midnight-bicycling",
    imageUrl: "/images/curated-life/midnight-bicycling-marine-drive.png",
    location: "Queen's Necklace, Marine Drive",
    dateTime: "2026-06-20 23:30:00.000",
    description:
      "A gentle late-night route around the lit curve of the bay, with pauses for coconut water, chai, and unhurried conversation.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Private host team",
    hostBio:
      "The route is paced for conversation, not speed, with pauses at a few much-loved corners.",
    seatsTotal: 10,
  },
  {
    id: "exp_coffee_conversations",
    title: "Coffee & Conversations",
    slug: "coffee-conversations",
    imageUrl: "/images/curated-life/coffee-conversations-irani-cafe.png",
    location: "Ballard Estate, South Mumbai",
    dateTime: "2026-06-27 17:00:00.000",
    description:
      "An intimate table for warm introductions, thoughtful prompts, Irani chai, coffee, and fresh seasonal juice.",
    hostedByLabel: "Hosted by Zainab Contractor",
    hostName: "Zainab Contractor",
    hostTitle: "Trusted member host",
    hostBio:
      "Zainab hosts small rooms with a natural instinct for making strangers feel considered.",
    seatsTotal: 8,
  },
  {
    id: "exp_trail_horse_riding",
    title: "Trail Horse Riding",
    slug: "trail-horse-riding",
    imageUrl: "/images/curated-life/trail-horse-riding-matheran.png",
    location: "Matheran, near Mumbai",
    dateTime: "2026-07-05 07:00:00.000",
    description:
      "A composed morning on beginner-friendly hill-station trails with a trusted riding partner and a small group.",
    hostedByLabel: "Hosted by Armaan Stable Club",
    hostName: "Armaan Stable Club",
    hostTitle: "Partner host",
    hostBio:
      "A careful equestrian partner chosen for patient instruction, calm horses, and generous hospitality.",
    seatsTotal: 6,
  },
  {
    id: "exp_bowling_evenings",
    title: "Bowling Evenings",
    slug: "bowling-evenings",
    imageUrl: "/images/curated-life/bowling-evening-juices.png",
    location: "Phoenix Marketcity, Kurla",
    dateTime: "2026-07-10 20:00:00.000",
    description:
      "A relaxed evening for easy laughter, gentle competition, and fresh juices after the final frame.",
    hostedByLabel: "Hosted by The Curated Life",
    hostName: "The Curated Life",
    hostTitle: "Founder-led circle",
    hostBio:
      "Designed as a low-pressure night for members who enjoy social energy in a contained room.",
    seatsTotal: 14,
  },
];

for (const experience of experiences) {
  await db`
    INSERT INTO "Experience" (
      "id",
      "title",
      "slug",
      "description",
      "location",
      "dateTime",
      "imageUrl",
      "hostedByLabel",
      "hostName",
      "hostTitle",
      "hostBio",
      "seatsTotal",
      "isVisible",
      "isInviteOnly"
    )
    VALUES (
      ${experience.id},
      ${experience.title},
      ${experience.slug},
      ${experience.description},
      ${experience.location},
      ${experience.dateTime},
      ${experience.imageUrl},
      ${experience.hostedByLabel},
      ${experience.hostName},
      ${experience.hostTitle},
      ${experience.hostBio},
      ${experience.seatsTotal},
      true,
      true
    )
    ON CONFLICT ("slug") DO UPDATE SET
      "title" = EXCLUDED."title",
      "description" = EXCLUDED."description",
      "location" = EXCLUDED."location",
      "dateTime" = EXCLUDED."dateTime",
      "imageUrl" = EXCLUDED."imageUrl",
      "hostedByLabel" = EXCLUDED."hostedByLabel",
      "hostName" = EXCLUDED."hostName",
      "hostTitle" = EXCLUDED."hostTitle",
      "hostBio" = EXCLUDED."hostBio",
      "seatsTotal" = EXCLUDED."seatsTotal",
      "isVisible" = EXCLUDED."isVisible",
      "isInviteOnly" = EXCLUDED."isInviteOnly";
  `;
}

const rows = await db`SELECT "slug" FROM "Experience" ORDER BY "dateTime" ASC;`;
console.log(JSON.stringify({ seeded: rows.length, slugs: rows.map((row) => row.slug) }));
