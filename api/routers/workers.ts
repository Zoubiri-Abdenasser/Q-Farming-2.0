import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../middleware";
import { db } from "../queries/connection";
import { workers, workerStatusEnum } from "../../db/schema";
import { Errors } from "../../contracts/errors";
import { assertFarmMember, isWorkerMembership } from "../lib/farm-access";

const workerStatusSchema = z.enum(workerStatusEnum);

const workerInputSchema = z.object({
  farmId: z.string(),
  name: z.string().min(2, "اسم العامل يجب أن يكون حرفين على الأقل"),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  status: workerStatusSchema.optional(),
  fieldId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  hireDate: z.coerce.date().optional(),
  dailyWage: z.coerce.number().nonnegative().optional(),
});

export const workersRouter = router({
  list: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      const membership = await assertFarmMember(ctx.user, input.farmId);

      // Worker: only own operational record linked to account
      if (isWorkerMembership(membership)) {
        return db
          .select()
          .from(workers)
          .where(
            and(eq(workers.farmId, input.farmId), eq(workers.userId, ctx.user.id))
          )
          .orderBy(desc(workers.createdAt));
      }

      return db
        .select()
        .from(workers)
        .where(eq(workers.farmId, input.farmId))
        .orderBy(desc(workers.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      const membership = await assertFarmMember(ctx.user, input.farmId);
      const rows = await db
        .select()
        .from(workers)
        .where(and(eq(workers.id, input.id), eq(workers.farmId, input.farmId)))
        .limit(1);
      const worker = rows[0];
      if (!worker) throw Errors.NOT_FOUND("العامل");

      if (isWorkerMembership(membership) && worker.userId !== ctx.user.id) {
        throw Errors.FORBIDDEN();
      }
      return worker;
    }),

  create: protectedProcedure
    .input(workerInputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      const id = randomUUID();
      await db.insert(workers).values({
        id,
        farmId: input.farmId,
        name: input.name,
        phone: input.phone,
        specialty: input.specialty,
        status: input.status ?? "active",
        fieldId: input.fieldId || null,
        userId: input.userId || null,
        hireDate: input.hireDate,
        dailyWage: input.dailyWage !== undefined ? String(input.dailyWage) : undefined,
      });
      const rows = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
      return rows[0];
    }),

  update: protectedProcedure
    .input(workerInputSchema.partial().extend({ id: z.string(), farmId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      const { id, farmId, dailyWage, fieldId, userId, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (dailyWage !== undefined) {
        updateData.dailyWage = String(dailyWage);
      }
      if (fieldId !== undefined) {
        updateData.fieldId = fieldId || null;
      }
      if (userId !== undefined) {
        updateData.userId = userId || null;
      }

      await db
        .update(workers)
        .set(updateData)
        .where(and(eq(workers.id, id), eq(workers.farmId, farmId)));

      const rows = await db
        .select()
        .from(workers)
        .where(and(eq(workers.id, id), eq(workers.farmId, farmId)))
        .limit(1);
      const updated = rows[0];
      if (!updated) throw Errors.NOT_FOUND("العامل");
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      await db
        .delete(workers)
        .where(and(eq(workers.id, input.id), eq(workers.farmId, input.farmId)));
      return { success: true };
    }),

  /**
   * Link a team member (user) to a field: create or update workers row.
   * This is what allows a worker account to see only assigned fields.
   */
  assignToField: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        userId: z.string(),
        fieldId: z.string().nullable(),
        name: z.string().min(2),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      const existing = await db
        .select()
        .from(workers)
        .where(
          and(eq(workers.farmId, input.farmId), eq(workers.userId, input.userId))
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(workers)
          .set({
            fieldId: input.fieldId,
            name: input.name,
            phone: input.phone,
            status: "active",
          })
          .where(eq(workers.id, existing[0].id));
        const rows = await db
          .select()
          .from(workers)
          .where(eq(workers.id, existing[0].id))
          .limit(1);
        return rows[0];
      }

      const id = randomUUID();
      await db.insert(workers).values({
        id,
        farmId: input.farmId,
        userId: input.userId,
        name: input.name,
        phone: input.phone,
        fieldId: input.fieldId,
        status: "active",
      });
      const rows = await db.select().from(workers).where(eq(workers.id, id)).limit(1);
      return rows[0];
    }),
});