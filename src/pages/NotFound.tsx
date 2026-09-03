import { Link } from "react-router";
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-6xl mb-4">🌱</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - الصفحة غير موجودة</h1>
      <p className="text-gray-500 mb-6">الصفحة التي تبحث عنها غير موجودة.</p>
      <Link to="/" className="text-[#1c3d2e] font-medium hover:underline">
        العودة للرئيسية
      </Link>
    </div>
  );
}