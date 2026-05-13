import { randomBytes, createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { isAdminEmail } from "@/lib/admin/access";
import { getPrisma } from "@/lib/prisma/client";

export const SESSION_COOKIE_NAME = "curated_life_session";
const SESSION_DAYS = 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRawSessionToken() {
  return randomBytes(32).toString("base64url");
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function createSessionForUser(userId: string, response: NextResponse) {
  const rawToken = createRawSessionToken();
  const expiresAt = sessionExpiresAt();
  const headerStore = await headers();

  await getPrisma().session.create({
    data: {
      id: randomUUID(),
      userId,
      token: hashSessionToken(rawToken),
      expiresAt,
      ipAddress:
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip"),
      userAgent: headerStore.get("user-agent"),
    },
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    rawToken,
    sessionCookieOptions(expiresAt),
  );
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) return;

  await getPrisma().session
    .deleteMany({
      where: { token: hashSessionToken(rawToken) },
    })
    .catch(() => undefined);
}

export async function getSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) return null;

  const session = await getPrisma().session.findUnique({
    where: { token: hashSessionToken(rawToken) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

function hasApprovedAccess(user: {
  email: string;
  accessStatus: AccessStatus;
  suspendedAt?: Date | null;
}) {
  return (
    !user.suspendedAt &&
    (user.accessStatus === AccessStatus.APPROVED || isAdminEmail(user.email))
  );
}

export function destinationForUser(user: { email: string; role: UserRole }) {
  return isAdminEmail(user.email) || user.role === UserRole.ADMIN ? "/admin" : "/member";
}

export async function requireApprovedMember() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasApprovedAccess(user)) {
    redirect("/login?status=not-granted");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireApprovedMember();

  if (!isAdminEmail(user.email) && user.role !== UserRole.ADMIN) {
    redirect("/member");
  }

  return user;
}

export async function getAuthorizedMember() {
  const user = await getCurrentUser();

  if (!user || !hasApprovedAccess(user)) {
    return null;
  }

  return user;
}

export async function getAuthorizedAdmin() {
  const user = await getAuthorizedMember();

  if (!user || (!isAdminEmail(user.email) && user.role !== UserRole.ADMIN)) {
    return null;
  }

  return user;
}
