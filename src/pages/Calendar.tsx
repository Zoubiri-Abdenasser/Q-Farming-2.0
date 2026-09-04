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

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  type: (typeof eventTypes)[number];
  fieldId: string | null;
  startAt: Date | string;
  endAt: Date | string | null;
};

const typeEmoji: Record<string, string> = {
  irrigation: "💧",
  fertilization: "🧪",
  harvest: "🧺",
  planting: "🌱",
  meeting: "👥",
  maintenance: "🔧",
  other: "📌",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toLocalInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(d: Date | string | null | undefined, locale: string): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatFull(d: Date | string | null | undefined, locale: string): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

/** شبكة الشهر: خلايا فارغة + أيام الشهر (الاثنين أولاً) */
function buildMonthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const weekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < weekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPage() {
  const { t, lang } = useLanguage();
  const { currentFarmId } = useFarm();
  const canManage = useHasRole("farm_manager");
  const utils = trpc.useUtils();

  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB";
  const today = useMemo(() => startOfDay(new Date()), []);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthLabel = viewDate.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const eventsQuery = trpc.calendar.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );
  const fieldsQuery = trpc.fields.list.useQuery(
    { farmId: currentFarmId! },
    { enabled: !!currentFarmId }
  );

  const events = (eventsQuery.data ?? []) as CalEvent[];

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const d = startOfDay(new Date(ev.startAt));
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  const selectedEvents = useMemo(() => {
    const list = eventsByDay.get(dayKey(selectedDate)) ?? [];
    return [...list].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
  }, [eventsByDay, selectedDate]);

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

  function fieldName(fieldId: string | null) {
    if (!fieldId) return "—";
    return fieldsQuery.data?.find((f) => f.id === fieldId)?.name ?? "—";
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToday() {
    const now = startOfDay(new Date());
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function openCreateForDay(day: Date) {
    setEditingId(null);
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    reset({
      title: "",
      description: "",
      type: "irrigation",
      fieldId: "",
      startAt: toLocalInputValue(start),
      endAt: "",
    });
    setModalOpen(true);
  }

  function openEdit(ev: CalEvent) {
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

  const selectedLabel = selectedDate.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🗓️ {t("cal_title")}</h1>
          <p className="text-sm text-gray-500">{t("cal_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToday}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            {t("cal_today")}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => openCreateForDay(selectedDate)}
              className="bg-[#1c3d2e] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15301f]"
            >
              + {t("cal_add")}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-lg"
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 capitalize text-center">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="w-10 h-10 rounded-lg border border-gray-200 hover:bg-gray-50 text-lg"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((w) => (
            <div
              key={w}
              className="text-center text-[10px] sm:text-xs font-medium text-gray-500 py-1"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`e-${idx}`}
                  className="min-h-12 sm:min-h-16 rounded-lg bg-transparent"
                />
              );
            }
            const key = dayKey(day);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = sameDay(day, today);
            const isSelected = sameDay(day, selectedDate);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(startOfDay(day))}
                onDoubleClick={() => {
                  if (canManage) openCreateForDay(day);
                }}
                className={[
                  "min-h-12 sm:min-h-16 rounded-lg border p-1 sm:p-1.5 text-start transition-colors",
                  isSelected
                    ? "border-[#1c3d2e] bg-green-50 ring-1 ring-[#1c3d2e]/20"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-0.5">
                  <span
                    className={[
                      "inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm font-semibold rounded-full",
                      isToday ? "bg-[#1c3d2e] text-white" : "text-gray-800",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-green-700 font-medium hidden sm:inline">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 space-y-0.5 hidden sm:block">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[10px] truncate text-gray-600 leading-tight"
                    >
                      {typeEmoji[ev.type]} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-gray-400">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1 sm:hidden justify-center">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className="w-1.5 h-1.5 rounded-full bg-green-600"
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold text-gray-800 text-sm capitalize">
            {selectedLabel}
            {sameDay(selectedDate, today) && (
              <span className="ms-2 text-xs font-normal text-green-700">
                ({t("cal_today")})
              </span>
            )}
          </h2>
          {canManage && (
            <button
              type="button"
              onClick={() => openCreateForDay(selectedDate)}
              className="text-xs text-green-800 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-50"
            >
              + {t("cal_add")}
            </button>
          )}
        </div>

        {eventsQuery.isLoading && (
          <p className="text-sm text-gray-500">{t("loading")}...</p>
        )}

        {!eventsQuery.isLoading && selectedEvents.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            {t("cal_empty_day")}
          </p>
        )}

        <ul className="divide-y divide-gray-50">
          {selectedEvents.map((ev) => (
            <li
              key={ev.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="text-2xl shrink-0">
                  {typeEmoji[ev.type] ?? "📌"}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-500">
                    {t(`cal_type_${ev.type}`)} · {fieldName(ev.fieldId)}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {formatTime(ev.startAt, locale)}
                    {ev.endAt ? ` → ${formatTime(ev.endAt, locale)}` : ""}
                    <span className="text-gray-400">
                      {" "}
                      · {formatFull(ev.startAt, locale)}
                    </span>
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