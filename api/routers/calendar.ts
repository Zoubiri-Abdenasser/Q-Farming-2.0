import { z } from "zod";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../middleware";
import { db } from "../queries/connection";
import { calendarEvents, calendarEventTypeEnum } from "../../db/schema";
import { Errors } from "../../contracts/errors";
import { assertFarmMember } from "../lib/farm-access";


const typeSchema = z.enum(calendarEventTypeEnum);

const eventInputSchema = z.object({
  farmId: z.string(),
  title: z.string().min(2, "العنوان مطلوب"),
  description: z.string().optional(),
  type: typeSchema,
  fieldId: z.string().optional().nullable(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
});

export const calendarRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId);

      const conditions = [eq(calendarEvents.farmId, input.farmId)];
      if (input.from) conditions.push(gte(calendarEvents.startAt, input.from));
      if (input.to) conditions.push(lte(calendarEvents.startAt, input.to));

      return db
        .select()
        .from(calendarEvents)
        .where(and(...conditions))
        .orderBy(asc(calendarEvents.startAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId);
      const rows = await db
        .select()
        .from(calendarEvents)
        .where(
          and(eq(calendarEvents.id, input.id), eq(calendarEvents.farmId, input.farmId))
        )
        .limit(1);
      if (!rows[0]) throw Errors.NOT_FOUND("الحدث");
      return rows[0];
    }),

  create: protectedProcedure
    .input(eventInputSchema)
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      const id = randomUUID();
      await db.insert(calendarEvents).values({
        id,
        farmId: input.farmId,
        title: input.title,
        description: input.description,
        type: input.type,
        fieldId: input.fieldId || null,
        startAt: input.startAt,
        endAt: input.endAt || null,
        createdBy: ctx.user.id,
      });
      const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
      return rows[0];
    }),

  update: protectedProcedure
    .input(eventInputSchema.partial().extend({ id: z.string(), farmId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      const { id, farmId, fieldId, endAt, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (fieldId !== undefined) updateData.fieldId = fieldId || null;
      if (endAt !== undefined) updateData.endAt = endAt || null;
      await db
        .update(calendarEvents)
        .set(updateData)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.farmId, farmId)));
      const rows = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.farmId, farmId)))
        .limit(1);
      if (!rows[0]) throw Errors.NOT_FOUND("الحدث");
      return rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), farmId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      await db
        .delete(calendarEvents)
        .where(and(eq(calendarEvents.id, input.id), eq(calendarEvents.farmId, input.farmId)));
      return { success: true };
    }),
});