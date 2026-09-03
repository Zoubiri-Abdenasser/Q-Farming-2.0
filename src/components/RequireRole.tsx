import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useFarm } from "../hooks/useFarm";
import { ROLE_HIERARCHY, type Role } from "../../contracts/constants";

function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

/**
 * يمنع الوصول المباشر عبر الرابط حسب دور المزرعة الحالية (أو الدور العام).
 */
export function RedirectIfNoRole({
  minRole,
  children,
}: {
  minRole: Role;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { currentFarm } = useFarm();
  if (!user) return null;

  const effective =
    (currentFarm?.myRole as Role | undefined) || (user.role as Role);
  if (!hasMinRole(effective, minRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}