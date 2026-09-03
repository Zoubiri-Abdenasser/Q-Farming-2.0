export const SESSION_COOKIE_NAME = "qf_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 أيام

export const ROLES = ["admin", "farm_manager", "agronomist", "worker"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  farm_manager: 3,
  agronomist: 2,
  worker: 1,
};