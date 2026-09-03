import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { useFarm } from "../hooks/useFarm";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { trpc } from "../providers/trpc";
import { useIsWorkerOnly } from "../hooks/usePermissions";
import type { ReactNode } from "react";

const STATUS_COLORS: Record<string, string> = {
  preparing: "#f59e0b",
  active: "#16a34a",
  fallow: "#94a3b8",
  harvested: "#2563eb",
};

const CROP_COLORS = ["#16a34a", "#0d9488", "#2563eb", "#d97706", "#7c3aed", "#db2777"];

function StatCard({
  icon,
  label,
  value,
  hint,
  hintColor = "text-green-600",
}: {
  icon: string;
  label: string;
  value: string;
  hint: string;
  hintColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        <p className={`text-xs ${hintColor}`}>{hint}</p>
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { currentFarmId, currentFarm } = useFarm();
  const isWorker = useIsWorkerOnly();

  const fieldsQuery = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const workersQuery = trpc.workers.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId && !isWorker }
  );

  const fields = fieldsQuery.data ?? [];
  const workers = workersQuery.data ?? [];

  const totalArea = fields.reduce((sum, f) => sum + Number(f.areaHectares || 0), 0);
  const activeFields = fields.filter((f) => f.status === "active").length;
  const preparingFields = fields.filter((f) => f.status === "preparing").length;
  const activeWorkers = workers.filter((w) => w.status === "active").length;

  const statusChartData = (["preparing", "active", "fallow", "harvested"] as const).map(
    (status) => ({
      status,
      label: t(`status_${status}`),
      count: fields.filter((f) => f.status === status).length,
      fill: STATUS_COLORS[status],
    })
  );

  const cropMap = new Map<string, number>();
  for (const f of fields) {
    const key = f.cropType || "—";
    cropMap.set(key, (cropMap.get(key) ?? 0) + 1);
  }
  const cropChartData = Array.from(cropMap.entries()).map(([name, value], i) => ({
    name,
    value,
    fill: CROP_COLORS[i % CROP_COLORS.length],
  }));

  const loading = fieldsQuery.isLoading || (!isWorker && workersQuery.isLoading);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {t("welcome")}, {user?.name} 👋
        </h1>
        <p className="text-sm text-gray-500">
          {currentFarm?.name
            ? `${currentFarm.name} — ${t("dashboard_subtitle")}`
            : t("dashboard_subtitle")}
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">{t("loading")}...</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon="🌾"
          label={t("dash_fields_total")}
          value={String(fields.length)}
          hint={`${activeFields} ${t("dash_fields_active")}`}
        />
        <StatCard
          icon="📐"
          label={t("dash_total_area")}
          value={`${totalArea.toFixed(2)} ha`}
          hint={t("dash_area_hint")}
        />
        {!isWorker && (
          <StatCard
            icon="👷"
            label={t("dash_workers_total")}
            value={String(workers.length)}
            hint={`${activeWorkers} ${t("dash_workers_active")}`}
          />
        )}
        <StatCard
          icon="🌱"
          label={t("dash_preparing")}
          value={String(preparingFields)}
          hint={t("status_preparing")}
          hintColor="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Card title={t("dash_fields_by_status")}>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{t("fields_empty")}</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title={t("dash_crops_distribution")}>
          {cropChartData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{t("fields_empty")}</p>
          ) : (
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cropChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {cropChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card
        title={t("dash_recent_fields")}
        action={
          <Link to="/fields" className="text-xs text-green-700 hover:underline font-medium">
            {t("dash_view_all")}
          </Link>
        }
      >
        {fields.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm space-y-3">
            <p>{t("fields_empty")}</p>
            {!isWorker && (
              <Link
                to="/fields"
                className="inline-block bg-[#1c3d2e] text-white text-sm px-4 py-2 rounded-lg"
              >
                + {t("fields_add")}
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-start py-2 px-2 font-medium">{t("fields_name")}</th>
                  <th className="text-start py-2 px-2 font-medium">{t("fields_crop")}</th>
                  <th className="text-start py-2 px-2 font-medium">{t("fields_area")}</th>
                  <th className="text-start py-2 px-2 font-medium">{t("fields_status")}</th>
                </tr>
              </thead>
              <tbody>
                {fields.slice(0, 8).map((f) => (
                  <tr key={f.id} className="border-t border-gray-50">
                    <td className="py-2.5 px-2 font-medium text-gray-900">{f.name}</td>
                    <td className="py-2.5 px-2 text-gray-600">{f.cropType}</td>
                    <td className="py-2.5 px-2 text-gray-600">
                      {Number(f.areaHectares).toFixed(2)} ha
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[f.status] ?? "#94a3b8" }}
                      >
                        {t(`status_${f.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-gray-400 text-center">{t("dash_iot_note")}</p>
    </div>
  );
}