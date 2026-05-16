import { NextResponse } from "next/server";
import { getAuthorizedAdmin } from "@/lib/auth/server";
import { getPrisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const migrations = [
  {
    id: "20260512182000_init",
    name: "20260512182000_init",
    checksum: "352ffd21cde56571acfc7f6e6cab521af1359a20d8eba10d9ba06e908999bc8f",
  },
  {
    id: "20260513090000_private_access",
    name: "20260513090000_private_access_password_events",
    checksum: "786299e3ed6ed19f9df2ac22fa2e31ae3436b78d12cb8b7c2f2f1d6c8208daef",
  },
  {
    id: "20260516090000_lifecycle",
    name: "20260516090000_member_experience_lifecycle",
    checksum: "584c98bcca9c2a0ac8de6fa2904aa85f05d27ce2b1757382b6163ad4683cc48b",
  },
];

async function run(sql: string) {
  await getPrisma().$executeRawUnsafe(sql);
}

export async function POST(request: Request) {
  const admin = await getAuthorizedAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (body?.confirm !== "apply-curated-life-production-migration") {
    return NextResponse.json({ error: "Migration confirmation required." }, { status: 400 });
  }

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventStatus') THEN
        CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'POSTPONED', 'CANCELLED', 'ARCHIVED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventVisibility') THEN
        CREATE TYPE "EventVisibility" AS ENUM ('ALL_MEMBERS', 'SELECTED_MEMBERS', 'INVITE_ONLY');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackCategory') THEN
        CREATE TYPE "FeedbackCategory" AS ENUM ('EXPERIENCE_FEEDBACK', 'PRODUCT_FEEDBACK', 'TECHNICAL_ISSUE', 'SUGGESTION', 'GENERAL_MESSAGE');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
        CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'REPLIED', 'CLOSED');
      END IF;
    END $$;
  `);

  await run(`ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED'`);

  await run(`
    ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
      ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
  `);

  await run(`
    ALTER TABLE "AccessRequest"
      ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
      ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);

  await run(`
    ALTER TABLE "Experience"
      ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "status" "EventStatus",
      ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "announcementSentAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "postponedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
      ADD COLUMN IF NOT EXISTS "postponementMessage" TEXT,
      ADD COLUMN IF NOT EXISTS "visibilityType" "EventVisibility" NOT NULL DEFAULT 'ALL_MEMBERS',
      ADD COLUMN IF NOT EXISTS "attendeeVisibilityEnabled" BOOLEAN NOT NULL DEFAULT true;
  `);

  await run(`
    UPDATE "Experience"
    SET "status" = CASE
      WHEN "isArchived" = true THEN 'ARCHIVED'::"EventStatus"
      WHEN "isVisible" = true THEN 'PUBLISHED'::"EventStatus"
      ELSE 'DRAFT'::"EventStatus"
    END
    WHERE "status" IS NULL;
  `);

  await run(`
    UPDATE "Experience"
    SET "publishedAt" = COALESCE("publishedAt", "createdAt")
    WHERE "isArchived" = false AND "isVisible" = true AND "publishedAt" IS NULL;
  `);

  await run(`
    ALTER TABLE "Experience"
      ALTER COLUMN "status" SET NOT NULL,
      ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
  `);

  await run(`
    ALTER TABLE "Reservation"
      ADD COLUMN IF NOT EXISTS "cancellationRequestedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
      ADD COLUMN IF NOT EXISTS "cancellationNote" TEXT,
      ADD COLUMN IF NOT EXISTS "previousStatus" "ReservationStatus",
      ADD COLUMN IF NOT EXISTS "adminCancellationReply" TEXT;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "PasswordSetupToken" (
      "id" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordSetupToken_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
      "id" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "AdminNote" (
      "id" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "note" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "ExperienceAudienceMember" (
      "id" TEXT NOT NULL,
      "experienceId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ExperienceAudienceMember_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "FeedbackThread" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "category" "FeedbackCategory" NOT NULL,
      "subject" TEXT NOT NULL,
      "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FeedbackThread_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "FeedbackMessage" (
      "id" TEXT NOT NULL,
      "threadId" TEXT NOT NULL,
      "senderId" TEXT,
      "isAdmin" BOOLEAN NOT NULL DEFAULT false,
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
    );
  `);

  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordSetupToken_tokenHash_key" ON "PasswordSetupToken"("tokenHash")`);
  await run(`CREATE INDEX IF NOT EXISTS "PasswordSetupToken_userId_idx" ON "PasswordSetupToken"("userId")`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")`);
  await run(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")`);
  await run(`CREATE INDEX IF NOT EXISTS "AdminNote_entityType_entityId_idx" ON "AdminNote"("entityType", "entityId")`);
  await run(`CREATE INDEX IF NOT EXISTS "Experience_isArchived_idx" ON "Experience"("isArchived")`);
  await run(`CREATE INDEX IF NOT EXISTS "Experience_status_idx" ON "Experience"("status")`);
  await run(`CREATE INDEX IF NOT EXISTS "Experience_visibilityType_idx" ON "Experience"("visibilityType")`);
  await run(`CREATE INDEX IF NOT EXISTS "Reservation_experienceId_status_idx" ON "Reservation"("experienceId", "status")`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "ExperienceAudienceMember_experienceId_userId_key" ON "ExperienceAudienceMember"("experienceId", "userId")`);
  await run(`CREATE INDEX IF NOT EXISTS "ExperienceAudienceMember_userId_idx" ON "ExperienceAudienceMember"("userId")`);
  await run(`CREATE INDEX IF NOT EXISTS "FeedbackThread_userId_idx" ON "FeedbackThread"("userId")`);
  await run(`CREATE INDEX IF NOT EXISTS "FeedbackThread_status_idx" ON "FeedbackThread"("status")`);
  await run(`CREATE INDEX IF NOT EXISTS "FeedbackThread_category_idx" ON "FeedbackThread"("category")`);
  await run(`CREATE INDEX IF NOT EXISTS "FeedbackMessage_threadId_idx" ON "FeedbackMessage"("threadId")`);
  await run(`CREATE INDEX IF NOT EXISTS "FeedbackMessage_senderId_idx" ON "FeedbackMessage"("senderId")`);

  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordSetupToken_userId_fkey') THEN
        ALTER TABLE "PasswordSetupToken" ADD CONSTRAINT "PasswordSetupToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExperienceAudienceMember_experienceId_fkey') THEN
        ALTER TABLE "ExperienceAudienceMember" ADD CONSTRAINT "ExperienceAudienceMember_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExperienceAudienceMember_userId_fkey') THEN
        ALTER TABLE "ExperienceAudienceMember" ADD CONSTRAINT "ExperienceAudienceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeedbackThread_userId_fkey') THEN
        ALTER TABLE "FeedbackThread" ADD CONSTRAINT "FeedbackThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeedbackMessage_threadId_fkey') THEN
        ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "FeedbackThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeedbackMessage_senderId_fkey') THEN
        ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);

  for (const migration of migrations) {
    await getPrisma().$executeRaw`
      INSERT INTO "_prisma_migrations" (
        "id",
        "checksum",
        "finished_at",
        "migration_name",
        "logs",
        "rolled_back_at",
        "started_at",
        "applied_steps_count"
      )
      SELECT
        ${migration.id},
        ${migration.checksum},
        now(),
        ${migration.name},
        NULL,
        NULL,
        now(),
        1
      WHERE NOT EXISTS (
        SELECT 1 FROM "_prisma_migrations"
        WHERE "migration_name" = ${migration.name}
      )
    `;
  }

  return NextResponse.json({
    ok: true,
    message: "Production migration applied.",
  });
}
