import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { trpc } from "../providers/trpc";
import { useAuth } from "./useAuth";

type FarmSummary = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  ownerId: string;
  createdAt: Date | string;
  myRole: string | null;
};

type FarmContextValue = {
  farms: FarmSummary[];
  currentFarm: FarmSummary | null;
  currentFarmId: string | null;
  setCurrentFarmId: (id: string) => void;
  isLoading: boolean;
  refetchFarms: () => void;
};

const FarmContext = createContext<FarmContextValue | null>(null);

const STORAGE_KEY = "qf_current_farm_id";

/**
 * Mode "مزرعة واحدة" في الواجهة:
 * - يختار تلقائياً أول مزرعة متاحة
 * - إن لم توجد مزرعة، ينشئ واحدة تلقائياً للمستخدم (إن كان لديه صلاحية)
 * - الـ multi-farm يبقى في الـ backend للتطوير المستقبلي
 */
export function FarmProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [currentFarmId, setCurrentFarmIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const autoCreateTried = useRef(false);

  const farmsQuery = trpc.farms.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createFarmMutation = trpc.farms.create.useMutation({
    onSuccess: (farm) => {
      farmsQuery.refetch();
      setCurrentFarmId(farm.id);
    },
  });

  const farms = (farmsQuery.data ?? []) as FarmSummary[];

  // اختيار تلقائي لأول مزرعة
  useEffect(() => {
    if (!farms.length) return;
    const stillValid = currentFarmId && farms.some((f) => f.id === currentFarmId);
    if (!stillValid) {
      setCurrentFarmId(farms[0].id);
    }
  }, [farms, currentFarmId]);

  // إنشاء مزرعة افتراضية تلقائياً إن لم توجد أي مزرعة
  useEffect(() => {
    if (!isAuthenticated || farmsQuery.isLoading || autoCreateTried.current) return;
    if (farms.length > 0) return;

    // فقط farm_manager أو admin يمكنهم الإنشاء
    const role = user?.role;
    if (role !== "admin" && role !== "farm_manager") return;

    autoCreateTried.current = true;
    createFarmMutation.mutate({
      name: "مزرعتي",
      location: undefined,
      description: "المزرعة الرئيسية",
    });
  }, [isAuthenticated, farmsQuery.isLoading, farms.length, user?.role]);

  function setCurrentFarmId(id: string) {
    setCurrentFarmIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  const currentFarm = farms.find((f) => f.id === currentFarmId) ?? null;

  return (
    <FarmContext.Provider
      value={{
        farms,
        currentFarm,
        currentFarmId,
        setCurrentFarmId,
        isLoading: farmsQuery.isLoading || createFarmMutation.isPending,
        refetchFarms: () => farmsQuery.refetch(),
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error("useFarm must be used within FarmProvider");
  }
  return ctx;
}
