import { useState, useEffect } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useFarm } from "../../hooks/useFarm";
import { useLanguage } from "../../lib/i18n/LanguageContext";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ROLE_HIERARCHY, type Role } from "../../../contracts/constants";

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

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentFarm } = useFarm();
  const location = useLocation();

  const effectiveRole =
    (currentFarm?.myRole as Role) || (user?.role as Role);
  const visibleItems = navItems.filter((item) =>
    hasMinRole(effectiveRole, item.minRole)
  );

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed md:static inset-y-0 start-0 z-50 w-64 max-w-[85vw]",
          "bg-[#14301f] text-white flex flex-col shrink-0",
          "transform transition-transform duration-200 ease-out",
          "md:translate-x-0",
          open
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full md:rtl:translate-x-0",
        ].join(" ")}
      >
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🌱</span>
            <div className="min-w-0">
              <h1 className="font-bold leading-tight truncate">{t("appName")}</h1>
              <p className="text-[11px] text-green-200/70 truncate">{t("tagline")}</p>
            </div>
          </div>
          <button
            type="button"
            className="md:hidden text-white/80 text-xl px-2 py-1"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
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
    </>
  );
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { currentFarm } = useFarm();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    window.location.href = "/login";
  }

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-700"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium min-w-0">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span className="hidden sm:inline truncate">{t("system_online")}</span>
          {currentFarm && (
            <span className="text-gray-500 font-normal truncate">
              · 🏡 {currentFarm.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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

        <button type="button" className="relative text-lg p-1.5" aria-label="notifications">
          🔔
          <span className="absolute -top-0.5 -end-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1c3d2e] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden sm:block max-w-[120px]">
            <p className="text-sm font-medium text-gray-800 leading-tight truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 leading-tight truncate">
              {currentFarm?.myRole || user?.role}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg px-2 sm:px-3 py-1.5"
            title={t("logout")}
          >
            <span className="sm:hidden">⎋</span>
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}