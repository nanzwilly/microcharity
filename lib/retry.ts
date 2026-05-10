// Tiny retry wrapper for "max+1 scan" sequence allocators (MCID, receipt #, application #).
// Two concurrent allocations can pick the same N; the @@unique constraint makes the second
// transaction throw P2002 ("Unique constraint failed"). Retrying the whole closure picks
// up the now-incremented max. Three attempts is plenty for a small charity workload.

import { Prisma } from "@prisma/client";

export async function retryOnUniqueViolation<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        lastErr = e;
        // Tiny jittered backoff so the second attempt isn't perfectly synchronised
        // with whoever just won the race.
        await new Promise((r) => setTimeout(r, 25 + Math.random() * 50));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
