import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma/client";

const PASSWORD_MIN_LENGTH = 8;
const TOKEN_BYTES = 32;
const SETUP_TOKEN_HOURS = 72;
const RESET_TOKEN_HOURS = 2;

export function assertValidPassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error("Password must be at least 8 characters.");
  }
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function expiry(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function hashPassword(password: string) {
  assertValidPassword(password);
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createPasswordSetupToken(userId: string) {
  const token = randomToken();
  const tokenHash = hashOpaqueToken(token);
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.passwordSetupToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    prisma.passwordSetupToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: expiry(SETUP_TOKEN_HOURS),
      },
    }),
  ]);

  return token;
}

export async function createPasswordResetToken(userId: string) {
  const token = randomToken();
  const tokenHash = hashOpaqueToken(token);
  const prisma = getPrisma();

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: expiry(RESET_TOKEN_HOURS),
      },
    }),
  ]);

  return token;
}

export async function getValidPasswordSetupToken(token: string) {
  if (!token) return null;

  return getPrisma().passwordSetupToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}

export async function getValidPasswordResetToken(token: string) {
  if (!token) return null;

  return getPrisma().passwordResetToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
}
