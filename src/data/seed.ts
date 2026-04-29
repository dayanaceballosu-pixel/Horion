/**
 * Legacy seed file — kept as a no-op so any stale imports compile cleanly.
 * Real seeding now happens in `auth.ts → ensureUserBootstrap()` after the
 * user signs in, writing the client's confirmed defaults to Firestore.
 */
export async function seedIfEmpty(): Promise<void> {
  /* intentionally empty */
}
