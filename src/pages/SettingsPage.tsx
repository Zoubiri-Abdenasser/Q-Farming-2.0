import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../providers/trpc";
import { useFarm } from "../hooks/useFarm";
import { useAuth } from "../hooks/useAuth";

const acceptSchema = z.object({
  code: z.string().min(6, "الكود غير صالح"),
});

type AcceptForm = z.infer<typeof acceptSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentFarm, isLoading, refetchFarms, setCurrentFarmId } = useFarm();
  const [message, setMessage] = useState<string | null>(null);

  const acceptForm = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  const acceptMutation = trpc.farms.acceptInvite.useMutation({
    onSuccess: (data) => {
      setMessage(`انضممت إلى المزرعة "${data.farm?.name}" كـ ${data.role}`);
      refetchFarms();
      if (data.farm?.id) setCurrentFarmId(data.farm.id);
      acceptForm.reset();
    },
    onError: (err) => setMessage(err.message),
  });

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">⚙️ الإعدادات</h1>

      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">الملف الشخصي</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">الاسم</p>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">البريد</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">الدور</p>
            <p className="font-medium">{currentFarm?.myRole || user?.role}</p>
          </div>
          <div>
            <p className="text-gray-500">المزرعة</p>
            <p className="font-medium">
              {isLoading ? "..." : currentFarm?.name ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">معلومات المزرعة</h2>
        {isLoading ? (
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        ) : currentFarm ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">الاسم</p>
              <p className="font-medium">{currentFarm.name}</p>
            </div>
            <div>
              <p className="text-gray-500">الموقع</p>
              <p className="font-medium">{currentFarm.location || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">الوصف</p>
              <p className="font-medium">{currentFarm.description || "—"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">جاري تهيئة المزرعة تلقائياً...</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-2">إدارة الفريق</h2>
        <p className="text-sm text-gray-500 mb-3">
          لإضافة عمال أو تغيير أدوارهم، استخدم صفحة <strong>الفريق</strong>.
        </p>
        <a
          href="/team"
          className="inline-block bg-[#1c3d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#15301f]"
        >
          فتح صفحة الفريق
        </a>
      </section>

      {/* قبول دعوة بالكود — خيار ثانوي */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-2">الانضمام عبر كود دعوة</h2>
        <p className="text-sm text-gray-500 mb-4">
          إذا استلمت كود دعوة، أدخله هنا (يجب أن يطابق بريدك بريد الدعوة).
        </p>
        <form
          onSubmit={acceptForm.handleSubmit((v) => acceptMutation.mutate(v))}
          className="flex gap-3"
        >
          <input
            {...acceptForm.register("code")}
            placeholder="مثال: A1B2C3D4E5F6"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono uppercase"
          />
          <button
            type="submit"
            disabled={acceptMutation.isPending}
            className="bg-[#1c3d2e] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            انضمام
          </button>
        </form>
      </section>
    </div>
  );
}
