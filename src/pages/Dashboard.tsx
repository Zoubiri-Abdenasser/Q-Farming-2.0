import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../lib/i18n/LanguageContext";

const soilHumidityData = [
  { day: "19", value: 58 },
  { day: "20", value: 55 },
  { day: "21", value: 62 },
  { day: "22", value: 60 },
  { day: "23", value: 57 },
  { day: "24", value: 63 },
  { day: "25", value: 62 },
];

const temperatureData = [
  { day: "19", value: 26 },
  { day: "20", value: 27 },
  { day: "21", value: 28.4 },
  { day: "22", value: 27.5 },
  { day: "23", value: 26.8 },
  { day: "24", value: 29 },
  { day: "25", value: 28.4 },
];

const sensorActivityData = [
  { day: "19", value: 15 },
  { day: "20", value: 17 },
  { day: "21", value: 16 },
  { day: "22", value: 18 },
  { day: "23", value: 17 },
  { day: "24", value: 18 },
  { day: "25", value: 18 },
];

const initialValves = [
  { id: 1, open: true },
  { id: 2, open: true },
  { id: 3, open: false },
  { id: 4, open: true },
];

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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
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
  const [valves, setValves] = useState(initialValves);

  const toggleValve = (id: number) => {
    setValves((prev) => prev.map((v) => (v.id === id ? { ...v, open: !v.open } : v)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {t("welcome")}, {user?.name} 👋
        </h1>
        <p className="text-sm text-gray-500">{t("dashboard_subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="💧" label={t("stat_water")} value="2,670 m³/ha" hint={`-45% ${t("stat_water_hint")}`} />
        <StatCard icon="🌿" label={t("stat_production")} value="42,800 kg/ha" hint={`+22% ${t("stat_production_hint")}`} />
        <StatCard icon="🌡️" label={t("stat_temperature")} value="28.4°C" hint={t("stat_temperature_hint")} hintColor="text-amber-500" />
        <StatCard icon="💦" label={t("stat_soil_humidity")} value="62%" hint={t("stat_soil_humidity_hint")} />
        <StatCard icon="📡" label={t("stat_active_sensors")} value="18 / 20" hint={t("stat_active_sensors_hint")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={t("map_title")}>
          <div className="h-56 rounded-lg bg-gradient-to-br from-green-100 via-amber-50 to-green-50 border border-gray-100 flex items-center justify-center text-gray-400 text-sm">
            🗺️ {t("no_data_yet")}
          </div>
        </Card>

        <Card title={t("irrigation_title")}>
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 mb-4">
              <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1c8f4c"
                  strokeWidth="3"
                  strokeDasharray="83, 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">83%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">{t("irrigation_efficiency")}</p>

            <div className="w-full text-sm space-y-1 mb-4">
              <div className="flex justify-between text-gray-500">
                <span>{t("irrigation_next")}</span>
                <span className="font-medium text-gray-800">2h 15m</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{t("irrigation_duration")}</span>
                <span className="font-medium text-gray-800">35 min</span>
              </div>
            </div>

            <button className="w-full bg-[#1c8f4c] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#157a3f] transition-colors">
              💧 {t("irrigation_now")}
            </button>
          </div>
        </Card>

        <Card title={t("valves_title")}>
          <div className="space-y-3">
            {valves.map((valve) => (
              <div key={valve.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Valve {valve.id}</p>
                  <p className={`text-xs ${valve.open ? "text-green-600" : "text-red-500"}`}>
                    {valve.open ? t("valve_open") : t("valve_closed")}
                  </p>
                </div>
                <button
                  onClick={() => toggleValve(valve.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    valve.open ? "bg-[#1c8f4c]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      valve.open ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
            <button className="w-full text-xs text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 mt-2">
              {t("valves_close_all")}
            </button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={t("chart_soil_humidity")} action={<span className="text-xs text-gray-400">{t("period_7days")}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={soilHumidityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1c8f4c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t("chart_temperature")} action={<span className="text-xs text-gray-400">{t("period_7days")}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t("chart_sensor_activity")} action={<span className="text-xs text-gray-400">{t("period_7days")}</span>}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sensorActivityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1c8f4c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={t("recent_alerts")}>
          <div className="space-y-3">
            {[
              { icon: "⚠️", text: "Low soil moisture - Field 2", time: "30m" },
              { icon: "ℹ️", text: "Irrigation completed - Field 1", time: "1h" },
              { icon: "⚠️", text: "Low battery - Gateway", time: "3h" },
            ].map((alert, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{alert.icon}</span>
                  <span className="text-gray-700">{alert.text}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  {alert.time}
                  <button className="text-[#1c8f4c] font-medium">{t("view")}</button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title={t("marketplace_title")}
          action={<span className="text-xs text-[#1c8f4c] font-medium cursor-pointer">{t("view_all")}</span>}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: "🍅", name: "Tomatoes", price: "1,200 DZD/kg" },
              { emoji: "🥔", name: "Potatoes", price: "80 DZD/kg" },
              { emoji: "🧅", name: "Onions", price: "90 DZD/kg" },
            ].map((product, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 text-center">
                <div className="text-3xl mb-1">{product.emoji}</div>
                <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">{product.price}</p>
                <p className="text-[10px] text-green-600 mt-1">{t("available")}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}