import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { MemberDashboard } from "@/components/member/MemberDashboard";
import { requireApprovedMember } from "@/lib/auth/server";
import { getPrisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function MemberPage() {
  const member = await requireApprovedMember();
  const prisma = getPrisma();

  const [experiences, reservations, referrals] = await Promise.all([
    prisma.experience.findMany({
      where: { isVisible: true },
      orderBy: { dateTime: "asc" },
    }),
    prisma.reservation.findMany({
      where: { userId: member.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { referrerId: member.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <MemberDashboard
          member={{
            fullName: member.fullName,
            email: member.email,
            createdAt: member.createdAt.toISOString(),
          }}
          experiences={experiences.map((experience) => ({
            id: experience.id,
            title: experience.title,
            description: experience.description,
            location: experience.location,
            dateTime: experience.dateTime.toISOString(),
            hostedByLabel: experience.hostedByLabel,
            hostName: experience.hostName,
            hostTitle: experience.hostTitle,
            seatsTotal: experience.seatsTotal,
          }))}
          reservations={reservations.map((reservation) => ({
            id: reservation.id,
            experienceId: reservation.experienceId,
            status: reservation.status,
          }))}
          referrals={referrals.map((referral) => ({
            id: referral.id,
            referredName: referral.referredName,
            referredEmail: referral.referredEmail,
            relationship: referral.relationship,
            status: referral.status,
          }))}
        />
      </main>
      <Footer />
    </div>
  );
}
