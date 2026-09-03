import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireRole, router } from "../middleware";
import { db } from "../queries/connection";
import { users, farmMembers } from "../../db/schema";
import { findUserByEmail } from "../queries/users";
import { hashPassword } from "../auth/password";
import { Errors } from "../../contracts/errors";
import { ROLES } from "../../contracts/constants";
import { assertFarmMember } from "../lib/farm-access";

const roleSchema = z.enum(ROLES);

const createUserInputSchema = z.object({
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  role: roleSchema,
  phone: z.string().optional(),
  /** إن وُجد → يُضاف المستخدم مباشرة كعضو في هذه المزرعة */
  farmId: z.string().optional(),
});

export const usersRouter = router({
  list: requireRole("admin").query(async () => {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  create: requireRole("admin")
    .input(createUserInputSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw Errors.EMAIL_TAKEN();
      }

      // إن طُلب الربط بمزرعة، التحقق من صلاحية المدير على المزرعة
      if (input.farmId) {
        await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      }

      const id = randomUUID();
      const passwordHash = await hashPassword(input.password);

      // الدور العام: worker افتراضياً إلا إذا كان admin نظام
      const globalRole = input.role === "admin" ? "admin" : input.role;

      await db.insert(users).values({
        id,
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: globalRole,
        phone: input.phone,
      });

      // إضافة عضوية المزرعة تلقائياً
      if (input.farmId) {
        const farmRole = input.role === "admin" ? "farm_manager" : input.role;
        await db.insert(farmMembers).values({
          id: randomUUID(),
          farmId: input.farmId,
          userId: id,
          role: farmRole,
          isActive: true,
        });
      }

      return {
        id,
        name: input.name,
        email: input.email,
        role: globalRole,
        farmId: input.farmId ?? null,
      };
    }),

  updateRole: requireRole("admin")
    .input(z.object({ id: z.string(), role: roleSchema }))
    .mutation(async ({ input }) => {
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
      return { success: true };
    }),

  toggleActive: requireRole("admin")
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.id));
      return { success: true };
    }),

  delete: requireRole("admin")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id === ctx.user.id) {
        throw Errors.FORBIDDEN();
      }
      // حذف العضويات أولاً ثم المستخدم
      await db.delete(farmMembers).where(eq(farmMembers.userId, input.id));
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
