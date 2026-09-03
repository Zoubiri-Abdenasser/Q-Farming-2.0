import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../providers/trpc";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { Modal } from "../components/Modal";
import { useHasRole } from "../hooks/usePermissions";
import { useFarm } from "../hooks/useFarm";

const statusOptions = ["preparing", "active", "fallow", "harvested"] as const;

const fieldSchema = z.object({
  name: z.string().min(2),
  cropType: z.string().min(2),
  areaHectares: z.coerce.number().positive(),
  location: z.string().optional(),
  status: z.enum(statusOptions),
  notes: z.string().optional(),
});

type FieldFormInput = z.input<typeof fieldSchema>;
type FieldFormValues = z.output<typeof fieldSchema>;

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  preparing: "bg-amber-100 text-amber-700",
  fallow: "bg-gray-100 text-gray-600",
  harvested: "bg-blue-100 text-blue-700",
};

export default function Fields() {
  const { t } = useLanguage();
  const canManage = useHasRole("farm_manager");
  const { currentFarmId } = useFarm();
  const utils = trpc.useUtils();
  const { data: fieldsList, isLoading } = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FieldFormInput, unknown, FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: { status: "preparing" },
  });

  const createMutation = trpc.fields.create.useMutation({
    onSuccess: () => {
      utils.fields.list.invalidate();
      closeModal();
    },
  });

  const updateMutation = trpc.fields.update.useMutation({
    onSuccess: () => {
      utils.fields.list.invalidate();
      closeModal();
    },
  });

  const deleteMutation = trpc.fields.delete.useMutation({
    onSuccess: () => utils.fields.list.invalidate(),
  });

  function openCreateModal() {
    setEditingId(null);
    reset({ name: "", cropType: "", areaHectares: undefined, location: "", status: "preparing", notes: "" });
    setModalOpen(true);
  }

  function openEditModal(field: NonNullable<typeof fieldsList>[number]) {
    setEditingId(field.id);
    reset({
      name: field.name,
      cropType: field.cropType,
      areaHectares: Number(field.areaHectares),
      location: field.location ?? "",
      status: field.status,
      notes: field.notes ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  if (!currentFarmId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        أنشئ أو اختر مزرعة أولاً للبدء
      </div>
    );
  }

  const onSubmit = (values: FieldFormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, farmId: currentFarmId!, ...values });
    } else {
      createMutation.mutate({ farmId: currentFarmId!, ...values });
    }
  };

  function handleDelete(id: string) {
    if (confirm(t("fields_confirm_delete"))) {
      deleteMutation.mutate({ id, farmId: currentFarmId! });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">🌾 {t("fields_title")}</h1>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="bg-[#1c3d2e] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15301f] transition-colors"
          >
            + {t("fields_add")}
          </button>
        )}
      </div>

      {isLoading && <p className="text-gray-500 text-sm">...</p>}

      {!isLoading && fieldsList && fieldsList.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
          {t("fields_empty")}
        </div>
      )}

      {!isLoading && fieldsList && fieldsList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fieldsList.map((field) => (
            <div key={field.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{field.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[field.status]}`}>
                  {t(`status_${field.status}`)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">🌱 {field.cropType}</p>
              <p className="text-sm text-gray-500 mb-1">
                📏 {Number(field.areaHectares).toLocaleString()} ha
              </p>
              {field.location && <p className="text-sm text-gray-500 mb-3">📍 {field.location}</p>}

              {canManage && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(field)}
                    className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50"
                  >
                    {t("fields_edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="flex-1 text-xs border border-red-200 text-red-600 rounded-lg py-1.5 hover:bg-red-50"
                  >
                    {t("fields_delete")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? t("fields_edit") : t("fields_add")} onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fields_name")}
              </label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fields_crop")}
              </label>
              <input
                {...register("cropType")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              {errors.cropType && (
                <p className="text-xs text-red-600 mt-1">{errors.cropType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("fields_area")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("areaHectares")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
                {errors.areaHectares && (
                  <p className="text-xs text-red-600 mt-1">{errors.areaHectares.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("fields_status")}
                </label>
                <select
                  {...register("status")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {t(`status_${s}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fields_location")}
              </label>
              <input
                {...register("location")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("fields_notes")}
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
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