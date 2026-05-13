import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
  curatedLifePrisma?: PrismaClientInstance;
};

export function getPrisma() {
  if (!globalForPrisma.curatedLifePrisma) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured.");
    }

    const adapter = new PrismaNeon({ connectionString });
    globalForPrisma.curatedLifePrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.curatedLifePrisma;
}
