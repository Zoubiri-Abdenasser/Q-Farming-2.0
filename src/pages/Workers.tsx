import { Link } from "react-router";
import { trpc } from "../providers/trpc";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { useFarm } from "../hooks/useFarm";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_leave: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-600",
};

/**
 * صفحة العمال = عرض تشغيلي فقط.
 * إنشاء حسابات الدخول يتم حصراً من /team
 */
export default function Workers() {
  const { t } = useLanguage();
  const { currentFarmId } = useFarm();

  const { data: workersList, isLoading } = trpc.workers.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const { data: fieldsList } = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );

  function fieldName(fieldId: string | null) {
    if (!fieldId || !fieldsList) return "—";
    return fieldsList.find((f) => f.id === fieldId)?.name ?? "—";
  }

  if (!currentFarmId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        ...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">👷 {t("workers_title")}</h1>
        <Link
          to="/team"
          className="bg-[#1c3d2e] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15301f] transition-colors"
        >
          {t("nav_team")} — {t("workers_add")}
        </Link>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {t("workers_managed_via_team")}
      </p>

      {isLoading && <p className="text-gray-500 text-sm">...</p>}

      {!isLoading && workersList && workersList.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
          {t("workers_empty")}
        </div>
      )}

      {!isLoading && workersList && workersList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-start px-5 py-3 font-medium">{t("workers_name")}</th>
                  <th className="text-start px-5 py-3 font-medium">{t("workers_phone")}</th>
                  <th className="text-start px-5 py-3 font-medium">{t("workers_specialty")}</th>
                  <th className="text-start px-5 py-3 font-medium">{t("workers_field")}</th>
                  <th className="text-start px-5 py-3 font-medium">{t("workers_status")}</th>
                </tr>
              </thead>
              <tbody>
                {workersList.map((w) => (
                  <tr key={w.id} className="border-t border-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{w.name}</td>
                    <td className="px-5 py-3 text-gray-600">{w.phone || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{w.specialty || "—"}</td>
                    <td className="px-5 py-3 text-gray-600">{fieldName(w.fieldId)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[w.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t(`worker_status_${w.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}