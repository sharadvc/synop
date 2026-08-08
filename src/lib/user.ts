import { auth, getAuth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * Current user id:
 *  - When Clerk is configured (deployed): the signed-in user's id.
 *  - Otherwise (localhost / self-hosted open mode): a stable local default.
 *
 * Reads filter by `userId: { in: [uid, null] }` so legacy rows (created before
 * accounts) stay visible, and writes set `userId` to the current id — this is
 * what makes per-account isolation + cross-device sync work.
 */
export async function currentUserId(req?: Request): Promise<string> {
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const userId = req ? getAuth(req as NextRequest).userId : (await auth()).userId;
      if (userId) return userId;
    } catch {
      // no auth context (e.g. unauthenticated) — fall through to open mode
    }
  }
  return 'local';
}

/** Prisma where-clause: this user's rows + legacy null-user rows. */
export async function userScope(uid?: string) {
  const resolved = uid || (await currentUserId());
  return { OR: [{ userId: resolved }, { userId: null }] };
}
