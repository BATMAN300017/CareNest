import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __careNestPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__careNestPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__careNestPrisma = prisma;
}

export default prisma;
