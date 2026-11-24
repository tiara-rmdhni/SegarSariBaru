import { eq } from 'drizzle-orm';
import { db, isDatabaseConfigured } from './index.ts';
import { users } from './schema.ts';

const DEFAULT_OWNER_EMAIL = 'tiara.ramadhani1706@gmail.com';

function getConfiguredAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const list = raw
    ? raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [DEFAULT_OWNER_EMAIL];
  return new Set(list);
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name = ''
) {
  const normalizedEmail = email.trim().toLowerCase();
  const adminEmails = getConfiguredAdminEmails();
  const isConfiguredAdmin = adminEmails.has(normalizedEmail);

  if (!isDatabaseConfigured()) {
    return {
      id: 0,
      uid,
      email: normalizedEmail,
      name,
      role: isConfiguredAdmin ? 'admin' : 'customer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  try {

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const nextRole =
        isConfiguredAdmin && current.role !== 'admin' ? 'admin' : current.role;

      if (
        current.email !== normalizedEmail ||
        current.name !== name ||
        current.role !== nextRole
      ) {
        const updated = await db
          .update(users)
          .set({
            email: normalizedEmail,
            name: name || current.name,
            role: nextRole,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return current;
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name,
        role: isConfiguredAdmin ? 'admin' : 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          name,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Gagal memverifikasi akun pengguna.', { cause: error });
  }
}
