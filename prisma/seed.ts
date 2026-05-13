import { PrismaNeon } from "@prisma/adapter-neon";
import { AccessStatus, UserRole } from "../lib/generated/prisma/enums";
import { PrismaClient } from "../lib/generated/prisma/client";
import { curatedExperiences } from "../lib/data/experiences";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed The Curated Life.");
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString }),
});

async function main() {
  for (const experience of curatedExperiences) {
    await prisma.experience.upsert({
      where: { slug: experience.slug },
      update: {
        title: experience.title,
        description: experience.description,
        location: experience.location,
        dateTime: new Date(experience.dateTime),
        imageUrl: experience.imageUrl,
        hostedByLabel: experience.hostedByLabel,
        hostName: experience.hostName,
        hostTitle: experience.hostTitle,
        hostBio: experience.hostBio,
        seatsTotal: experience.seatsTotal,
        isVisible: experience.isVisible,
        isInviteOnly: experience.isInviteOnly,
      },
      create: {
        title: experience.title,
        slug: experience.slug,
        description: experience.description,
        location: experience.location,
        dateTime: new Date(experience.dateTime),
        imageUrl: experience.imageUrl,
        hostedByLabel: experience.hostedByLabel,
        hostName: experience.hostName,
        hostTitle: experience.hostTitle,
        hostBio: experience.hostBio,
        seatsTotal: experience.seatsTotal,
        isVisible: experience.isVisible,
        isInviteOnly: experience.isInviteOnly,
      },
    });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: {
        accessStatus: AccessStatus.APPROVED,
        role: UserRole.ADMIN,
      },
      create: {
        email,
        fullName: "Curated Life Admin",
        accessStatus: AccessStatus.APPROVED,
        role: UserRole.ADMIN,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
