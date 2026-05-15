import { AdminConsole } from "@/components/admin/AdminConsole";
import { Footer } from "@/components/home/Footer";
import { SiteHeader } from "@/components/home/SiteHeader";
import { requireAdmin } from "@/lib/auth/server";
import { ReservationStatus } from "@/lib/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const prisma = getPrisma();

  const [requests, experiences, reservations, referrals, members, emailLogs, feedbackThreads] =
    await Promise.all([
      prisma.accessRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.experience.findMany({
        orderBy: { dateTime: "asc" },
        include: {
          reservations: {
            select: { id: true, status: true },
          },
          audienceMembers: {
            select: { userId: true },
          },
        },
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
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.feedbackThread.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
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
            reviewedAt: request.reviewedAt?.toISOString() ?? null,
            reviewedById: request.reviewedById,
            adminNote: request.adminNote,
            createdAt: request.createdAt.toISOString(),
          }))}
          experiences={experiences.map((experience) => {
            const confirmedCount = experience.reservations.filter(
              (reservation) => reservation.status === ReservationStatus.CONFIRMED,
            ).length;

            return {
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
              isArchived: experience.isArchived,
              status: experience.status,
              publishedAt: experience.publishedAt?.toISOString() ?? null,
              announcementSentAt:
                experience.announcementSentAt?.toISOString() ?? null,
              postponedAt: experience.postponedAt?.toISOString() ?? null,
              cancelledAt: experience.cancelledAt?.toISOString() ?? null,
              cancellationReason: experience.cancellationReason,
              postponementMessage: experience.postponementMessage,
              visibilityType: experience.visibilityType,
              attendeeVisibilityEnabled: experience.attendeeVisibilityEnabled,
              selectedMemberIds: experience.audienceMembers.map((member) => member.userId),
              confirmedCount,
              waitlistedCount: experience.reservations.filter(
                (reservation) => reservation.status === ReservationStatus.WAITLISTED,
              ).length,
              cancellationRequestCount: experience.reservations.filter(
                (reservation) =>
                  reservation.status === ReservationStatus.CANCELLATION_REQUESTED,
              ).length,
              reservationCount: experience.reservations.length,
              remainingSeats:
                experience.seatsTotal === null
                  ? null
                  : Math.max(experience.seatsTotal - confirmedCount, 0),
            };
          })}
          reservations={reservations.map((reservation) => ({
            id: reservation.id,
            status: reservation.status,
            createdAt: reservation.createdAt.toISOString(),
            memberName: reservation.user.fullName,
            memberEmail: reservation.user.email,
            experienceTitle: reservation.experience.title,
            seatsTotal: reservation.experience.seatsTotal,
            cancellationRequestedAt:
              reservation.cancellationRequestedAt?.toISOString() ?? null,
            cancellationReason: reservation.cancellationReason,
            cancellationNote: reservation.cancellationNote,
            previousStatus: reservation.previousStatus,
          }))}
          referrals={referrals.map((referral) => ({
            id: referral.id,
            referredName: referral.referredName,
            referredEmail: referral.referredEmail,
            relationship: referral.relationship,
            status: referral.status,
            referrerName: referral.referrer.fullName,
          }))}
          members={members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            email: member.email,
            role: member.role,
            accessStatus: member.accessStatus,
            passwordSetAt: member.passwordSetAt?.toISOString() ?? null,
            suspendedAt: member.suspendedAt?.toISOString() ?? null,
            createdAt: member.createdAt.toISOString(),
          }))}
          emailLogs={emailLogs.map((log) => ({
            id: log.id,
            toEmail: log.toEmail,
            templateKey: log.templateKey,
            status: log.status,
            providerMessageId: log.providerMessageId,
            createdAt: log.createdAt.toISOString(),
          }))}
          feedbackThreads={feedbackThreads.map((thread) => ({
            id: thread.id,
            category: thread.category,
            subject: thread.subject,
            status: thread.status,
            memberName: thread.user.fullName,
            memberEmail: thread.user.email,
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
