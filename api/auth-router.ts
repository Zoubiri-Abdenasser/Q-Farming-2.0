import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./middleware";
import { findUserByEmail, createUser, getUsersCount } from "./queries/users";
import { hashPassword, verifyPassword } from "./auth/password";
import { signSession } from "./lib/http";
import { setSessionCookie, clearSessionCookie } from "./lib/cookies";
import { Errors } from "../contracts/errors";
import type { AuthUser } from "../contracts/types";

function toAuthUser(dbUser: {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  avatarUrl: string | null;
}): AuthUser {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    avatarUrl: dbUser.avatarUrl,
  };
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
        email: z.string().email("بريد إلكتروني غير صالح"),
        password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // التسجيل الذاتي مسموح فقط لأول مستخدم (يصبح admin تلقائيًا)
      // بعد ذلك يُغلق التسجيل نهائيًا؛ الحسابات اللاحقة ينشئها المدير فقط
      const existingCount = await getUsersCount();
      if (existingCount > 0) {
        throw Errors.REGISTRATION_CLOSED();
      }

      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw Errors.EMAIL_TAKEN();
      }

      const passwordHash = await hashPassword(input.password);
      const newUser = await createUser({
        name: input.name,
        email: input.email,
        passwordHash,
      });

      if (!newUser) {
        throw new Error("فشل إنشاء المستخدم");
      }

      const token = await signSession({ userId: newUser.id, role: newUser.role });
      setSessionCookie(ctx.c, token);

      return { user: toAuthUser(newUser) };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbUser = await findUserByEmail(input.email);
      if (!dbUser || !dbUser.passwordHash) {
        throw Errors.INVALID_CREDENTIALS();
      }

      const isValid = await verifyPassword(input.password, dbUser.passwordHash);
      if (!isValid) {
        throw Errors.INVALID_CREDENTIALS();
      }

      if (!dbUser.isActive) {
        throw Errors.FORBIDDEN();
      }

      const token = await signSession({ userId: dbUser.id, role: dbUser.role });
      setSessionCookie(ctx.c, token);

      return { user: toAuthUser(dbUser) };
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.c);
    return { success: true };
  }),

  me: publicProcedure.query(({ ctx }) => {
    return { user: ctx.user };
  }),

  // يستخدمه الفرونت اند لمعرفة إذا كان التسجيل الذاتي متاحًا (لا يوجد أي مستخدم بعد)
  systemStatus: publicProcedure.query(async () => {
    const count = await getUsersCount();
    return { hasUsers: count > 0 };
  }),
});