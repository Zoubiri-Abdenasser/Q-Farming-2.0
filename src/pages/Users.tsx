import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../providers/trpc";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { Modal } from "../components/Modal";
import { useFarm } from "../hooks/useFarm";

const roleOptions = ["worker", "agronomist", "farm_manager", "admin"] as const;

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(roleOptions),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  farm_manager: "bg-blue-100 text-blue-700",
  agronomist: "bg-teal-100 text-teal-700",
  worker: "bg-gray-100 text-gray-600",
};

export default function Users() {
  const { currentFarmId } = useFarm();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const { data: usersList, isLoading } = trpc.users.list.useQuery();

  const [modalOpen, setModalOpen] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "worker" },
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      const values = getValues();
      setCreatedCreds({ email: values.email, password: values.password });
      setModalOpen(false);
      reset({ name: "", email: "", password: "", role: "worker", phone: "" });
    },
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
  });

  const onSubmit = (values: UserFormValues) => {
    createMutation.mutate({ ...values, farmId: currentFarmId ?? undefined });
  };

  function handleDelete(id: string) {
    if (confirm(t("users_confirm_delete"))) {
      deleteMutation.mutate({ id });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">🧑‍💼 {t("users_title")}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#1c3d2e] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15301f] transition-colors"
        >
          + {t("users_add")}
        </button>
      </div>

      {createdCreds && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-green-800 mb-1">{t("users_created_success")}</p>
            <p className="text-sm text-green-700">
              {t("users_email")}: <b>{createdCreds.email}</b> &nbsp;|&nbsp; {t("users_password")}:{" "}
              <b>{createdCreds.password}</b>
            </p>
            <p className="text-xs text-green-600 mt-1">{t("users_share_note")}</p>
          </div>
          <button onClick={() => setCreatedCreds(null)} className="text-green-600 text-lg">
            ✕
          </button>
        </div>
      )}

      {isLoading && <p className="text-gray-500 text-sm">...</p>}

      {!isLoading && usersList && usersList.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-start px-4 py-3 font-medium">{t("users_name")}</th>
                <th className="text-start px-4 py-3 font-medium">{t("users_email")}</th>
                <th className="text-start px-4 py-3 font-medium">{t("users_role")}</th>
                <th className="text-start px-4 py-3 font-medium">{t("users_active")}</th>
                <th className="text-start px-4 py-3 font-medium">{t("users_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[u.role]}`}>
                      {t(`role_${u.role}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        u.isActive ? "bg-[#1c8f4c]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          u.isActive ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-xs border border-red-200 text-red-600 rounded-lg px-2.5 py-1 hover:bg-red-50"
                    >
                      {t("users_delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={t("users_add")} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users_name")}
              </label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users_email")}
              </label>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users_password")}
              </label>
              <input
                type="text"
                {...register("password")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("users_role")}
              </label>
              <select
                {...register("role")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {t(`role_${r}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                {t("fields_cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#1c3d2e] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#15301f] disabled:opacity-60"
              >
                {t("fields_save")}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}