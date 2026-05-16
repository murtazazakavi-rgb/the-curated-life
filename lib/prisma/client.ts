import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { WebSocket } from "undici";
import { PrismaClient } from "@/lib/generated/prisma/client";

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
  curatedLifePrisma?: PrismaClientInstance;
};

let neonWebSocketConfigured = false;

function configureNeonWebSocket() {
  if (!neonWebSocketConfigured) {
    neonConfig.webSocketConstructor = WebSocket;
    neonWebSocketConfigured = true;
  }
}

export function getPrisma() {
  if (!globalForPrisma.curatedLifePrisma) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured.");
    }

    configureNeonWebSocket();

    const adapter = new PrismaNeon({ connectionString });
    globalForPrisma.curatedLifePrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.curatedLifePrisma;
}
