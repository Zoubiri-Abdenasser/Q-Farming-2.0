import { and, eq } from "drizzle-orm";
import { db } from "../queries/connection";
import { farmMembers, farms, workers } from "../../db/schema";
import { ROLE_HIERARCHY, type Role } from "../../contracts/constants";
import { Errors } from "../../contracts/errors";
import type { AuthUser } from "../../contracts/types";

/**
 * Vérifie que l'utilisateur est membre actif de la ferme.
 * Les admins système (role global = admin) ont accès à tout.
 * Retourne le membership (ou null pour admin système).
 */
export async function assertFarmMember(
  user: AuthUser,
  farmId: string,
  minRole: Role = "worker"
) {
  if (user.role === "admin") {
    return null;
  }

  const rows = await db
    .select()
    .from(farmMembers)
    .where(
      and(
        eq(farmMembers.farmId, farmId),
        eq(farmMembers.userId, user.id),
        eq(farmMembers.isActive, true)
      )
    )
    .limit(1);

  const membership = rows[0];
  if (!membership) {
    throw Errors.FORBIDDEN();
  }

  const userLevel = ROLE_HIERARCHY[membership.role];
  const requiredLevel = ROLE_HIERARCHY[minRole];
  if (userLevel < requiredLevel) {
    throw Errors.FORBIDDEN();
  }

  return membership;
}

export async function getFarmRole(user: AuthUser, farmId: string): Promise<Role | null> {
  if (user.role === "admin") return "admin";

  const rows = await db
    .select({ role: farmMembers.role })
    .from(farmMembers)
    .where(
      and(
        eq(farmMembers.farmId, farmId),
        eq(farmMembers.userId, user.id),
        eq(farmMembers.isActive, true)
      )
    )
    .limit(1);

  return rows[0]?.role ?? null;
}

export async function assertFarmExists(farmId: string) {
  const rows = await db
    .select({ id: farms.id })
    .from(farms)
    .where(eq(farms.id, farmId))
    .limit(1);
  if (!rows[0]) throw Errors.NOT_FOUND("المزرعة");
  return rows[0];
}

/** IDs des champs assignés à un ouvrier (via table workers.userId) */
export async function getWorkerFieldIds(
  userId: string,
  farmId: string
): Promise<string[]> {
  const rows = await db
    .select({ fieldId: workers.fieldId })
    .from(workers)
    .where(and(eq(workers.userId, userId), eq(workers.farmId, farmId)));

  return rows
    .map((r) => r.fieldId)
    .filter((id): id is string => !!id);
}

export function isWorkerMembership(
  membership: { role: Role } | null | undefined
): boolean {
  return !!membership && membership.role === "worker";
}