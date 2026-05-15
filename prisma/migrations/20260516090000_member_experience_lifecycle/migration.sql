-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'POSTPONED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('ALL_MEMBERS', 'SELECTED_MEMBERS', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('EXPERIENCE_FEEDBACK', 'PRODUCT_FEEDBACK', 'TECHNICAL_ISSUE', 'SUGGESTION', 'GENERAL_MESSAGE');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'REPLIED', 'CLOSED');

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED';

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN "status" "EventStatus",
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "announcementSentAt" TIMESTAMP(3),
ADD COLUMN "postponedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "postponementMessage" TEXT,
ADD COLUMN "visibilityType" "EventVisibility" NOT NULL DEFAULT 'ALL_MEMBERS',
ADD COLUMN "attendeeVisibilityEnabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Experience"
SET "status" = CASE
  WHEN "isArchived" = true THEN 'ARCHIVED'::"EventStatus"
  WHEN "isVisible" = true THEN 'PUBLISHED'::"EventStatus"
  ELSE 'DRAFT'::"EventStatus"
END,
"publishedAt" = CASE
  WHEN "isArchived" = false AND "isVisible" = true THEN COALESCE("publishedAt", "createdAt")
  ELSE "publishedAt"
END;

ALTER TABLE "Experience" ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancellationNote" TEXT,
ADD COLUMN "previousStatus" "ReservationStatus",
ADD COLUMN "adminCancellationReply" TEXT;

-- CreateTable
CREATE TABLE "ExperienceAudienceMember" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceAudienceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Experience_status_idx" ON "Experience"("status");

-- CreateIndex
CREATE INDEX "Experience_visibilityType_idx" ON "Experience"("visibilityType");

-- CreateIndex
CREATE INDEX "Reservation_experienceId_status_idx" ON "Reservation"("experienceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceAudienceMember_experienceId_userId_key" ON "ExperienceAudienceMember"("experienceId", "userId");

-- CreateIndex
CREATE INDEX "ExperienceAudienceMember_userId_idx" ON "ExperienceAudienceMember"("userId");

-- CreateIndex
CREATE INDEX "FeedbackThread_userId_idx" ON "FeedbackThread"("userId");

-- CreateIndex
CREATE INDEX "FeedbackThread_status_idx" ON "FeedbackThread"("status");

-- CreateIndex
CREATE INDEX "FeedbackThread_category_idx" ON "FeedbackThread"("category");

-- CreateIndex
CREATE INDEX "FeedbackMessage_threadId_idx" ON "FeedbackMessage"("threadId");

-- CreateIndex
CREATE INDEX "FeedbackMessage_senderId_idx" ON "FeedbackMessage"("senderId");

-- AddForeignKey
ALTER TABLE "ExperienceAudienceMember" ADD CONSTRAINT "ExperienceAudienceMember_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceAudienceMember" ADD CONSTRAINT "ExperienceAudienceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackThread" ADD CONSTRAINT "FeedbackThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "FeedbackThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
