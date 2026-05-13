import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccessStatus, UserRole } from "@/lib/generated/prisma/enums";
import { isAdminEmail } from "@/lib/admin/access";
import { getPrisma } from "@/lib/prisma/client";

function createAuthInstance() {
  const prisma = getPrisma();
  const siteUrl =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, "http://localhost:3000", "http://localhost:3001"],
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
        disableImplicitSignUp: true,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    user: {
      fields: {
        name: "fullName",
        image: "avatarUrl",
      },
      additionalFields: {
        accessStatus: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
        },
        referredBy: {
          type: "string",
          required: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = user.email.toLowerCase();
            const approvedRequest = await prisma.accessRequest.findFirst({
              where: {
                email,
                status: AccessStatus.APPROVED,
              },
            });

            if (!approvedRequest && !isAdminEmail(email)) {
              throw new APIError("FORBIDDEN", {
                message: "Access has not yet been granted.",
              });
            }

            return {
              data: {
                ...user,
                email,
                accessStatus: AccessStatus.APPROVED,
                role: isAdminEmail(email) ? UserRole.ADMIN : UserRole.MEMBER,
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: {
                email: true,
                accessStatus: true,
              },
            });

            if (
              !user ||
              (user.accessStatus !== AccessStatus.APPROVED && !isAdminEmail(user.email))
            ) {
              throw new APIError("FORBIDDEN", {
                message: "Access has not yet been granted.",
              });
            }

            return { data: session };
          },
        },
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuthInstance>;

let authInstance: AuthInstance | null = null;

export function getAuth() {
  if (authInstance) return authInstance;

  const auth = createAuthInstance();
  authInstance = auth;
  return auth;
}

export async function getSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  return getPrisma().user.findUnique({
    where: {
      email: session.user.email.toLowerCase(),
    },
  });
}

export async function requireApprovedMember() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.accessStatus !== AccessStatus.APPROVED && !isAdminEmail(user.email)) {
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

  if (!user || (user.accessStatus !== AccessStatus.APPROVED && !isAdminEmail(user.email))) {
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
