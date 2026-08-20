/**
 * Current user id.
 *
 * Synop is open by default (BYOK, no accounts): every request runs in the
 * single shared 'local' bucket. This function exists so a future auth layer
 * can be added without touching the call sites.
 */
export async function currentUserId(_req?: Request): Promise<string | null> {
  return 'local';
}

/**
 * Prisma where-clause for reads:
 *  - uid given → that user's rows + legacy null rows.
 *  - open mode (no auth) → 'local' rows + legacy null rows.
 */
export async function userScope(uid?: string | null) {
  const resolved = uid !== undefined ? uid : await currentUserId();
  if (resolved === null) return { userId: null };
  return { OR: [{ userId: resolved }, { userId: null }] };
}

/**
 * For mutating routes: returns the current user id. In open mode (the default
 * — Synop has no accounts) this is always 'local'.
 */
export async function requireUserId(_req?: Request): Promise<string | null> {
  return 'local';
}
