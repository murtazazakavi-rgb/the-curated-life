import { AdminConsole } from "@/components/admin/AdminConsole";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { requireAdmin } from "@/lib/auth/server";
import { getPrisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const prisma = getPrisma();

  const [requests, experiences, reservations, referrals] = await Promise.all([
    prisma.accessRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.experience.findMany({
      orderBy: { dateTime: "asc" },
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        experience: true,
      },
      take: 50,
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        referrer: true,
      },
      take: 50,
    }),
  ]);

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <AdminConsole
          requests={requests.map((request) => ({
            id: request.id,
            fullName: request.fullName,
            email: request.email,
            phone: request.phone,
            referredBy: request.referredBy,
            interests: request.interests,
            preferredExperiences: request.preferredExperiences,
            message: request.message,
            status: request.status,
            createdAt: request.createdAt.toISOString(),
          }))}
          experiences={experiences.map((experience) => ({
            id: experience.id,
            title: experience.title,
            slug: experience.slug,
            description: experience.description,
            location: experience.location,
            dateTime: experience.dateTime.toISOString(),
            imageUrl: experience.imageUrl,
            hostedByLabel: experience.hostedByLabel,
            hostName: experience.hostName,
            hostTitle: experience.hostTitle,
            hostBio: experience.hostBio,
            seatsTotal: experience.seatsTotal,
            isVisible: experience.isVisible,
            isInviteOnly: experience.isInviteOnly,
          }))}
          reservations={reservations.map((reservation) => ({
            id: reservation.id,
            status: reservation.status,
            createdAt: reservation.createdAt.toISOString(),
            memberName: reservation.user.fullName,
            memberEmail: reservation.user.email,
            experienceTitle: reservation.experience.title,
          }))}
          referrals={referrals.map((referral) => ({
            id: referral.id,
            referredName: referral.referredName,
            referredEmail: referral.referredEmail,
            relationship: referral.relationship,
            status: referral.status,
            referrerName: referral.referrer.fullName,
          }))}
        />
      </main>
      <Footer />
    </div>
  );
}
