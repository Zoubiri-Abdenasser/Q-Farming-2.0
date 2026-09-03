import { useAuth } from "./useAuth";
import { useFarm } from "./useFarm";
import { ROLE_HIERARCHY, type Role } from "../../contracts/constants";

/**
 * يتحقق من الدور داخل المزرعة الحالية إن وُجد، وإلا الدور العام.
 * مصدر التدرّج الوحيد: contracts/constants.ts → ROLE_HIERARCHY
 */
export function useHasRole(minRole: Role): boolean {
  const { user } = useAuth();
  const { currentFarm } = useFarm();
  if (!user) return false;

  const effective =
    (currentFarm?.myRole as Role | undefined) || (user.role as Role);
  return ROLE_HIERARCHY[effective] >= ROLE_HIERARCHY[minRole];
}

/** true إذا كان الدور الفعّال worker فقط */
export function useIsWorkerOnly(): boolean {
  const { user } = useAuth();
  const { currentFarm } = useFarm();
  if (!user) return false;
  const effective =
    (currentFarm?.myRole as Role | undefined) || (user.role as Role);
  return effective === "worker";
}