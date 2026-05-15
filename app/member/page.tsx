import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { MemberDashboard } from "@/components/member/MemberDashboard";
import { requireApprovedMember } from "@/lib/auth/server";
import { memberEligibleEventWhere } from "@/lib/events/lifecycle";
import { ReservationStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function MemberPage() {
  const member = await requireApprovedMember();
  const prisma = getPrisma();

  const [experiences, reservations, referrals, feedbackThreads] = await Promise.all([
    prisma.experience.findMany({
      where: memberEligibleEventWhere(member.id),
      orderBy: { dateTime: "asc" },
      include: {
        reservations: {
          where: { status: ReservationStatus.CONFIRMED },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.reservation.findMany({
      where: { userId: member.id },
      orderBy: { createdAt: "desc" },
      include: { experience: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: member.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedbackThread.findMany({
      where: { userId: member.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 3,
        },
      },
      take: 20,
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
            status: experience.status,
            attendeeVisibilityEnabled: experience.attendeeVisibilityEnabled,
            attendees: experience.reservations.map((reservation) => ({
              id: reservation.user.id,
              firstName: reservation.user.fullName.split(" ")[0] || reservation.user.fullName,
              avatarUrl: reservation.user.avatarUrl,
            })),
          }))}
          reservations={reservations.map((reservation) => ({
            id: reservation.id,
            experienceId: reservation.experienceId,
            status: reservation.status,
            cancellationRequestedAt:
              reservation.cancellationRequestedAt?.toISOString() ?? null,
            cancellationReason: reservation.cancellationReason,
            experienceTitle: reservation.experience.title,
            experienceDateTime: reservation.experience.dateTime.toISOString(),
            experienceLocation: reservation.experience.location,
            eventStatus: reservation.experience.status,
          }))}
          referrals={referrals.map((referral) => ({
            id: referral.id,
            referredName: referral.referredName,
            referredEmail: referral.referredEmail,
            relationship: referral.relationship,
            status: referral.status,
          }))}
          feedbackThreads={feedbackThreads.map((thread) => ({
            id: thread.id,
            category: thread.category,
            subject: thread.subject,
            status: thread.status,
            createdAt: thread.createdAt.toISOString(),
            messages: thread.messages.map((message) => ({
              id: message.id,
              isAdmin: message.isAdmin,
              message: message.message,
              createdAt: message.createdAt.toISOString(),
            })),
          }))}
        />
      </main>
      <Footer />
    </div>
  );
}
