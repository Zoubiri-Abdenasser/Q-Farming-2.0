import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data);
      navigate("/");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    }
  };

  return (
    <AuthLayout title="تسجيل الدخول" subtitle="أدخل بياناتك للوصول إلى حسابك">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            كلمة المرور
          </label>
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
          {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>

      <p className="text-sm text-gray-400 text-center mt-6">
        لا تملك حسابًا؟ يرجى التواصل مع مدير المزرعة لإنشاء حسابك.
      </p>
    </AuthLayout>
  );
}