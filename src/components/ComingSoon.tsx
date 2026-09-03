export function ComingSoon({ title, icon }: { title: string; icon: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {icon} {title}
      </h1>
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-gray-500">هذا القسم قيد الإنشاء وسنبنيه في خطوة قادمة 🚧</p>
      </div>
    </div>
  );
}