import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./connection";
import { users } from "../../db/schema";
import type { Role } from "../../contracts/constants";

export async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUsersCount(): Promise<number> {
  const rows = await db.select({ value: count() }).from(users);
  return rows[0]?.value ?? 0;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}) {
  const id = randomUUID();

  // أول مستخدم يسجّل في النظام يصبح تلقائيًا admin، وما بعده worker افتراضيًا
  let role: Role = input.role ?? "worker";
  if (!input.role) {
    const existingCount = await getUsersCount();
    if (existingCount === 0) {
      role = "admin";
    }
  }

  await db.insert(users).values({
    id,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    role,
  });
  return findUserById(id);
}