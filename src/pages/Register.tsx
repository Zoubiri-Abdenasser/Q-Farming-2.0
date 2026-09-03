import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../providers/trpc";

const registerSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  // نتحقق أولاً هل يوجد أي مستخدم بالفعل في النظام (يعني التسجيل الذاتي مغلق)
  const { data: systemStatus, isLoading: statusLoading } = trpc.auth.systemStatus.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await registerUser(data);
      navigate("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  };

  if (statusLoading) {
    return (
      <AuthLayout title="إنشاء حساب جديد" subtitle="">
        <p className="text-center text-gray-400 text-sm">...</p>
      </AuthLayout>
    );
  }

  // يوجد مستخدم واحد على الأقل بالفعل => التسجيل الذاتي مغلق نهائيًا
  if (systemStatus?.hasUsers) {
    return (
      <AuthLayout title="التسجيل مغلق" subtitle="">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <p className="text-gray-700 mb-2">
            التسجيل الذاتي مغلق. تم إنشاء حساب مدير المزرعة بالفعل.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            يرجى التواصل مع مدير المزرعة للحصول على حساب.
          </p>
          <Link to="/login" className="text-[#1c3d2e] font-medium hover:underline text-sm">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="إنشاء حساب مدير المزرعة"
      subtitle="هذا أول حساب في النظام وسيصبح تلقائيًا حساب المدير الرئيسي"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
          <input
            type="text"
            {...register("name")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="أحمد بن علي"
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
          <input
            type="password"
            {...register("password")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#1c3d2e] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#15301f] disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? "جارٍ الإنشاء..." : "إنشاء حساب المدير"}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        لديك حساب بالفعل؟{" "}
        <Link to="/login" className="text-[#1c3d2e] font-medium hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </AuthLayout>
  );
}