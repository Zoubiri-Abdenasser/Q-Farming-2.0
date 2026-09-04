import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../providers/trpc";
import { useFarm } from "../hooks/useFarm";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { useHasRole } from "../hooks/usePermissions";
import { Modal } from "../components/Modal";

const eventTypes = [
  "irrigation",
  "fertilization",
  "harvest",
  "planting",
  "meeting",
  "maintenance",
  "other",
] as const;

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(eventTypes),
  fieldId: z.string().optional(),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
});

type FormInput = z.input<typeof eventSchema>;
type FormValues = z.output<typeof eventSchema>;

const typeEmoji: Record<string, string> = {
  irrigation: "💧",
  fertilization: "🧪",
  harvest: "🧺",
  planting: "🌱",
  meeting: "👥",
  maintenance: "🔧",
  other: "📌",
};

function toLocalInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(d: Date | string | null | undefined, locale: string): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CalendarPage() {
  const { t, lang } = useLanguage();
  const { currentFarmId } = useFarm();
  const canManage = useHasRole("farm_manager");
  const utils = trpc.useUtils();

  const locale =
    lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const eventsQuery = trpc.calendar.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const fieldsQuery = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: "irrigation",
      title: "",
      description: "",
      fieldId: "",
      startAt: "",
      endAt: "",
    },
  });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      closeModal();
    },
  });
  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate();
      closeModal();
    },
  });
  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => utils.calendar.list.invalidate(),
  });

  const events = eventsQuery.data ?? [];

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => new Date(e.startAt).getTime() >= now - 24 * 60 * 60 * 1000)
      .sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
  }, [events]);

  const past = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => new Date(e.startAt).getTime() < now - 24 * 60 * 60 * 1000)
      .sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
      )
      .slice(0, 20);
  }, [events]);

  function fieldName(fieldId: string | null) {
    if (!fieldId) return "—";
    return fieldsQuery.data?.find((f) => f.id === fieldId)?.name ?? "—";
  }

  function openCreate() {
    setEditingId(null);
    const soon = new Date();
    soon.setMinutes(0, 0, 0);
    soon.setHours(soon.getHours() + 1);
    reset({
      title: "",
      description: "",
      type: "irrigation",
      fieldId: "",
      startAt: toLocalInputValue(soon),
      endAt: "",
    });
    setModalOpen(true);
  }

  function openEdit(ev: (typeof events)[number]) {
    setEditingId(ev.id);
    reset({
      title: ev.title,
      description: ev.description ?? "",
      type: ev.type,
      fieldId: ev.fieldId ?? "",
      startAt: toLocalInputValue(ev.startAt),
      endAt: toLocalInputValue(ev.endAt),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function onSubmit(values: FormValues) {
    if (!currentFarmId) return;
    const payload = {
      farmId: currentFarmId,
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      fieldId: values.fieldId || null,
      startAt: new Date(values.startAt),
      endAt: values.endAt ? new Date(values.endAt) : null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(id: string) {
    if (!currentFarmId) return;
    if (confirm(t("cal_confirm_delete"))) {
      deleteMutation.mutate({ id, farmId: currentFarmId });
    }
  }

  if (!currentFarmId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
        ...
      </div>
    );
  }

  function EventList({
    items,
    emptyText,
  }: {
    items: typeof events;
    emptyText: string;
  }) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-gray-400 text-center py-8">{emptyText}</p>
      );
    }
    return (
      <ul className="divide-y divide-gray-50">
        {items.map((ev) => (
          <li
            key={ev.id}
            className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span className="text-2xl shrink-0">{typeEmoji[ev.type] ?? "📌"}</span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                <p className="text-xs text-gray-500">
                  {t(`cal_type_${ev.type}`)} · {fieldName(ev.fieldId)}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDisplay(ev.startAt, locale)}
                  {ev.endAt ? ` → ${formatDisplay(ev.endAt, locale)}` : ""}
                </p>
                {ev.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {ev.description}
                  </p>
                )}
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2 shrink-0 ps-9 sm:ps-0">
                <button
                  type="button"
                  onClick={() => openEdit(ev)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                >
                  {t("cal_edit")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(ev.id)}
                  className="text-xs border border-red-200 text-red-600 rounded-lg px-2.5 py-1 hover:bg-red-50"
                >
                  {t("cal_delete")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🗓️ {t("cal_title")}</h1>
          <p className="text-sm text-gray-500">{t("cal_subtitle")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="bg-[#1c3d2e] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15301f]"
          >
            + {t("cal_add")}
          </button>
        )}
      </div>

      {eventsQuery.isLoading && (
        <p className="text-sm text-gray-500">{t("loading")}...</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">
          {t("cal_upcoming")}
        </h2>
        <EventList items={upcoming} emptyText={t("cal_empty_upcoming")} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">
          {t("cal_past")}
        </h2>
        <EventList items={past} emptyText={t("cal_empty_past")} />
      </div>

      {modalOpen && (
        <Modal
          title={editingId ? t("cal_edit") : t("cal_add")}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("cal_event_title")}
              </label>
              <input
                {...register("title")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {errors.title && (
                <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("cal_type")}
                </label>
                <select
                  {...register("type")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {eventTypes.map((ty) => (
                    <option key={ty} value={ty}>
                      {typeEmoji[ty]} {t(`cal_type_${ty}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("cal_field")}
                </label>
                <select
                  {...register("fieldId")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">{t("cal_no_field")}</option>
                  {fieldsQuery.data?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("cal_start")}
                </label>
                <input
                  type="datetime-local"
                  {...register("startAt")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {errors.startAt && (
                  <p className="text-xs text-red-600 mt-1">{errors.startAt.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("cal_end")}
                </label>
                <input
                  type="datetime-local"
                  {...register("endAt")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("cal_description")}
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {(createMutation.error || updateMutation.error) && (
              <p className="text-sm text-red-600">
                {createMutation.error?.message || updateMutation.error?.message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                {t("fields_cancel")}
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="flex-1 bg-[#1c3d2e] text-white rounded-lg py-2 text-sm disabled:opacity-60"
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