import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../middleware";
import { db } from "../queries/connection";
import { fields, fieldStatusEnum } from "../../db/schema";
import { Errors } from "../../contracts/errors";
import {
  assertFarmMember,
  getWorkerFieldIds,
  isWorkerMembership,
} from "../lib/farm-access";

const fieldStatusSchema = z.enum(fieldStatusEnum);

const fieldInputSchema = z.object({
  farmId: z.string(),
  name: z.string().min(2, "اسم الحقل يجب أن يكون حرفين على الأقل"),
  cropType: z.string().min(2, "نوع المحصول مطلوب"),
  areaHectares: z.coerce.number().positive("المساحة يجب أن تكون رقمًا موجبًا"),
  location: z.string().optional(),
  status: fieldStatusSchema.optional(),
  plantedDate: z.coerce.date().optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export const fieldsRouter = router({
  list: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      const membership = await assertFarmMember(ctx.user, input.farmId);

      // Worker: only fields assigned via workers.userId + workers.fieldId
      if (isWorkerMembership(membership)) {
        const fieldIds = await getWorkerFieldIds(ctx.user.id, input.farmId);
        if (fieldIds.length === 0) return [];
        return db
          .select()
          .from(fields)
          .where(and(eq(fields.farmId, input.farmId), inArray(fields.id, fieldIds)))
          .orderBy(desc(fields.createdAt));
      }

      return db
        .select()
        .from(fields)
        .where(eq(fields.farmId, input.farmId))
        .orderBy(desc(fields.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      const membership = await assertFarmMember(ctx.user, input.farmId);

      if (isWorkerMembership(membership)) {
        const fieldIds = await getWorkerFieldIds(ctx.user.id, input.farmId);
        if (!fieldIds.includes(input.id)) {
          throw Errors.FORBIDDEN();
        }
      }

      const rows = await db
        .select()
        .from(fields)
        .where(and(eq(fields.id, input.id), eq(fields.farmId, input.farmId)))
        .limit(1);
      const field = rows[0];
      if (!field) throw Errors.NOT_FOUND("الحقل");
      return field;
    }),

  create: protectedProcedure
    .input(fieldInputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      const id = randomUUID();
      await db.insert(fields).values({
        id,
        farmId: input.farmId,
        name: input.name,
        cropType: input.cropType,
        areaHectares: String(input.areaHectares),
        location: input.location,
        status: input.status ?? "preparing",
        plantedDate: input.plantedDate,
        expectedHarvestDate: input.expectedHarvestDate,
        notes: input.notes,
        managerId: ctx.user.id,
      });
      const rows = await db.select().from(fields).where(eq(fields.id, id)).limit(1);
      return rows[0];
    }),

  update: protectedProcedure
    .input(
      fieldInputSchema.partial().extend({
        id: z.string(),
        farmId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      const { id, farmId, areaHectares, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (areaHectares !== undefined) {
        updateData.areaHectares = String(areaHectares);
      }

      await db
        .update(fields)
        .set(updateData)
        .where(and(eq(fields.id, id), eq(fields.farmId, farmId)));

      const rows = await db
        .select()
        .from(fields)
        .where(and(eq(fields.id, id), eq(fields.farmId, farmId)))
        .limit(1);
      const updated = rows[0];
      if (!updated) throw Errors.NOT_FOUND("الحقل");
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      await db
        .delete(fields)
        .where(and(eq(fields.id, input.id), eq(fields.farmId, input.farmId)));
      return { success: true };
    }),
});