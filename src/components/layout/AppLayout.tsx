import { NavLink, Outlet, Navigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useFarm } from "../../hooks/useFarm";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ROLE_HIERARCHY, type Role } from "../../../contracts/constants";

/**
 * قائمة جانبية حسب الدور الفعّال داخل المزرعة.
 * العامل: لوحة، حقول، تنبيهات، تقويم، إعدادات، مساعدة فقط.
 */
const navItems: {
  to: string;
  key: string;
  icon: string;
  end?: boolean;
  minRole: Role;
}[] = [
  { to: "/", key: "nav_dashboard", icon: "🏠", end: true, minRole: "worker" },
  { to: "/fields", key: "nav_fields", icon: "🌾", minRole: "worker" },
  { to: "/sensors", key: "nav_sensors", icon: "📡", minRole: "agronomist" },
  { to: "/irrigation", key: "nav_irrigation", icon: "💧", minRole: "agronomist" },
  { to: "/alerts", key: "nav_alerts", icon: "🔔", minRole: "worker" },
  { to: "/marketplace", key: "nav_marketplace", icon: "🛒", minRole: "farm_manager" },
  { to: "/calendar", key: "nav_calendar", icon: "🗓️", minRole: "worker" },
  { to: "/analytics", key: "nav_reports", icon: "📊", minRole: "agronomist" },
  { to: "/workers", key: "nav_workers", icon: "👷", minRole: "farm_manager" },
  { to: "/inventory", key: "nav_inventory", icon: "📦", minRole: "farm_manager" },
  { to: "/team", key: "nav_team", icon: "👥", minRole: "farm_manager" },
  { to: "/users", key: "nav_users", icon: "🧑‍💼", minRole: "admin" },
  { to: "/settings", key: "nav_settings", icon: "⚙️", minRole: "farm_manager" },
  { to: "/help", key: "nav_help", icon: "❓", minRole: "worker" },
];

function hasMinRole(userRole: Role | undefined, minRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

function Sidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentFarm } = useFarm();

  const effectiveRole =
    (currentFarm?.myRole as Role) || (user?.role as Role);
  const visibleItems = navItems.filter((item) =>
    hasMinRole(effectiveRole, item.minRole)
  );

  return (
    <aside className="w-64 bg-[#14301f] text-white flex flex-col shrink-0">
      <div className="px-5 py-5 flex items-center gap-3">
        <span className="text-3xl">🌱</span>
        <div>
          <h1 className="font-bold leading-tight">{t("appName")}</h1>
          <p className="text-[11px] text-green-200/70">{t("tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#14301f]"
                  : "text-green-100/80 hover:bg-white/10"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl bg-white/10 p-4 text-center">
        <p className="text-xs text-green-200/80 mb-1">{t("ussd_title")}</p>
        <p className="text-2xl font-bold tracking-wide">*123#</p>
        <p className="text-[11px] text-green-200/60 mt-1">{t("ussd_desc")}</p>
      </div>
    </aside>
  );
}

function TopBar() {
   const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { currentFarm } = useFarm();

    async function handleLogout() {
    try {
      await logout();
    } catch {
      // تجاهل خطأ الشبكة؛ نوجّه لصفحة الدخول على أي حال
    }
    window.location.href = "/login";
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        {t("system_online")}
        {currentFarm && (
          <span className="ms-3 text-gray-500 font-normal">
            · 🏡 {currentFarm.name}
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div className="hidden lg:flex items-center gap-6 text-sm text-gray-600">
        <span>
          ☀️ {t("solar_energy")} <b className="text-gray-900">87%</b>
        </span>
        <span>
          📶 {t("lora_network")}{" "}
          <b className="text-gray-900">{t("connected")}</b>
        </span>
      </div>

      <LanguageSwitcher />

      <button className="relative text-lg" aria-label="notifications">
        🔔
        <span className="absolute -top-1 -end-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
          3
        </span>
      </button>

            <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#1c3d2e] text-white flex items-center justify-center text-xs font-semibold">
          {user?.name?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-800 leading-tight">
            {user?.name}
          </p>
          <p className="text-xs text-gray-400 leading-tight">
            {currentFarm?.myRole || user?.role}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="ms-2 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5"
          title={t("logout")}
        >
          {t("logout")}
        </button>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        ...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-[#f7f7f5]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}