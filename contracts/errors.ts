export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export const Errors = {
  UNAUTHORIZED: () => new AppError("يجب تسجيل الدخول أولاً", "UNAUTHORIZED", 401),
  FORBIDDEN: () => new AppError("ليس لديك صلاحية للقيام بهذا الإجراء", "FORBIDDEN", 403),
  NOT_FOUND: (entity = "العنصر") => new AppError(`${entity} غير موجود`, "NOT_FOUND", 404),
  INVALID_CREDENTIALS: () =>
    new AppError("البريد الإلكتروني أو كلمة المرور غير صحيحة", "INVALID_CREDENTIALS", 401),
  EMAIL_TAKEN: () => new AppError("هذا البريد الإلكتروني مستخدم بالفعل", "EMAIL_TAKEN", 409),
  REGISTRATION_CLOSED: () =>
    new AppError(
      "التسجيل الذاتي مغلق. يرجى التواصل مع مدير المزرعة لإنشاء حسابك.",
      "REGISTRATION_CLOSED",
      403
    ),
};