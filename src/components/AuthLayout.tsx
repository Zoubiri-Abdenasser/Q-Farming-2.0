import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f5] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌱</div>
          <h1 className="text-2xl font-bold text-[#1c3d2e]">Q-Farming 2.0</h1>
          <p className="text-sm text-gray-500 mt-1">الزراعة الذكية القريبة</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}