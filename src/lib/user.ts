import { auth, getAuth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

/**
 * Current user id:
 *  - No Clerk (localhost / self-hosted open mode): 'local' (all local data).
 *  - Clerk configured + signed in: the user's Clerk id.
 *  - Clerk configured + NOT signed in: null (API calls must be rejected).
 *
 * Reads scope with `userScope()` (this user + legacy null rows); writes should
 * call `requireUserId()` and 401 when it returns null.
 */
export async function currentUserId(req?: Request): Promise<string | null> {
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const userId = req ? getAuth(req as NextRequest).userId : (await auth()).userId;
      return userId || null;
    } catch {
      return null;
    }
  }
  return 'local';
}

/**
 * Prisma where-clause for reads:
 *  - uid given → that user's rows + legacy null rows.
 *  - uid null (Clerk on, unauthenticated) → legacy null rows only (no one's data).
 *  - open mode → 'local' rows + legacy null rows.
 */
export async function userScope(uid?: string | null) {
  const resolved = uid !== undefined ? uid : await currentUserId();
  if (resolved === null) return { userId: null };
  return { OR: [{ userId: resolved }, { userId: null }] };
}

/**
 * For mutating routes: returns the current user id, or null when the request
 * is not authenticated (only possible when Clerk is configured). Callers
 * should `if (!uid) return 401`. In open mode always returns 'local'.
 */
export async function requireUserId(req?: Request): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) return 'local';
  return currentUserId(req);
}
