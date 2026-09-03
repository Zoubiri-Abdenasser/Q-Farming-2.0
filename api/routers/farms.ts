import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { randomBytes, randomUUID } from "crypto";
import { router, protectedProcedure, requireRole } from "../middleware";
import { db } from "../queries/connection";
import {
  farms,
  farmMembers,
  farmInvitations,
  users,
  workers,
} from "../../db/schema";
import { Errors, AppError } from "../../contracts/errors";
import { ROLES } from "../../contracts/constants";
import { assertFarmMember, assertFarmExists } from "../lib/farm-access";
import { findUserByEmail } from "../queries/users";
import { hashPassword } from "../auth/password";

const roleSchema = z.enum(ROLES);

function generateInviteCode(): string {
  return randomBytes(6).toString("hex").toUpperCase(); // 12 caractères
}

export const farmsRouter = router({
  // Liste des fermes dont l'utilisateur est membre (ou toutes pour admin)
  listMine: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") {
      return db
        .select({
          id: farms.id,
          name: farms.name,
          location: farms.location,
          description: farms.description,
          ownerId: farms.ownerId,
          createdAt: farms.createdAt,
          myRole: farmMembers.role,
        })
        .from(farms)
        .leftJoin(
          farmMembers,
          and(eq(farmMembers.farmId, farms.id), eq(farmMembers.userId, ctx.user.id))
        )
        .orderBy(desc(farms.createdAt));
    }

    const rows = await db
      .select({
        id: farms.id,
        name: farms.name,
        location: farms.location,
        description: farms.description,
        ownerId: farms.ownerId,
        createdAt: farms.createdAt,
        myRole: farmMembers.role,
      })
      .from(farmMembers)
      .innerJoin(farms, eq(farmMembers.farmId, farms.id))
      .where(
        and(eq(farmMembers.userId, ctx.user.id), eq(farmMembers.isActive, true))
      )
      .orderBy(desc(farms.createdAt));

    return rows;
  }),

  // Créer une ferme (farm_manager ou admin). Le créateur devient owner + membre.
  create: requireRole("farm_manager")
    .input(
      z.object({
        name: z.string().min(2, "اسم المزرعة مطلوب"),
        location: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const farmId = randomUUID();
      const memberId = randomUUID();

      await db.insert(farms).values({
        id: farmId,
        name: input.name,
        location: input.location,
        description: input.description,
        ownerId: ctx.user.id,
      });

      await db.insert(farmMembers).values({
        id: memberId,
        farmId,
        userId: ctx.user.id,
        role: "farm_manager", // propriétaire = farm_manager au minimum
        isActive: true,
      });

      const rows = await db.select().from(farms).where(eq(farms.id, farmId)).limit(1);
      return rows[0];
    }),

  // Détails d'une ferme
  getById: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId);
      const rows = await db.select().from(farms).where(eq(farms.id, input.farmId)).limit(1);
      if (!rows[0]) throw Errors.NOT_FOUND("المزرعة");
      return rows[0];
    }),

  // Mettre à jour une ferme
  update: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        name: z.string().min(2).optional(),
        location: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      const { farmId, ...data } = input;
      await db.update(farms).set(data).where(eq(farms.id, farmId));
      const rows = await db.select().from(farms).where(eq(farms.id, farmId)).limit(1);
      return rows[0];
    }),

  // Liste des membres d'une ferme
  listMembers: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId);
      return db
        .select({
          id: farmMembers.id,
          role: farmMembers.role,
          isActive: farmMembers.isActive,
          joinedAt: farmMembers.joinedAt,
          userId: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
        })
        .from(farmMembers)
        .innerJoin(users, eq(farmMembers.userId, users.id))
        .where(eq(farmMembers.farmId, input.farmId))
        .orderBy(desc(farmMembers.joinedAt));
    }),

  // Inviter un membre (par email) → génère un code
  invite: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        email: z.string().email(),
        role: roleSchema.default("worker"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      await assertFarmExists(input.farmId);

      // Empêcher d'inviter quelqu'un déjà membre
      const existingUser = await findUserByEmail(input.email);
      if (existingUser) {
        const alreadyMember = await db
          .select({ id: farmMembers.id })
          .from(farmMembers)
          .where(
            and(
              eq(farmMembers.farmId, input.farmId),
              eq(farmMembers.userId, existingUser.id)
            )
          )
          .limit(1);
        if (alreadyMember[0]) {
          throw new AppError(
            "هذا المستخدم عضو بالفعل في المزرعة",
            "ALREADY_MEMBER",
            409
          );
        }
      }

      const code = generateInviteCode();
      const id = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 jours

      await db.insert(farmInvitations).values({
        id,
        farmId: input.farmId,
        email: input.email.toLowerCase(),
        role: input.role,
        code,
        invitedBy: ctx.user.id,
        expiresAt,
      });

      return { code, expiresAt, email: input.email };
    }),

  // Liste des invitations en attente d'une ferme
  listInvitations: protectedProcedure
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      return db
        .select()
        .from(farmInvitations)
        .where(
          and(eq(farmInvitations.farmId, input.farmId), isNull(farmInvitations.acceptedAt))
        )
        .orderBy(desc(farmInvitations.createdAt));
    }),

  // Accepter une invitation (par code). L'utilisateur doit être connecté.
  acceptInvite: protectedProcedure
    .input(z.object({ code: z.string().min(6) }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db
        .select()
        .from(farmInvitations)
        .where(eq(farmInvitations.code, input.code.toUpperCase()))
        .limit(1);

      const invitation = rows[0];
      if (!invitation) throw Errors.NOT_FOUND("الدعوة");
      if (invitation.acceptedAt) {
        throw new AppError(
          "هذه الدعوة مستخدمة بالفعل",
          "INVITE_USED",
          400
        );
      }
      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        throw new AppError(
          "انتهت صلاحية هذه الدعوة",
          "INVITE_EXPIRED",
          400
        );
      }

      // Vérifier que l'email correspond (sécurité)
      if (invitation.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
        throw new AppError(
          "هذه الدعوة موجهة لبريد إلكتروني آخر",
          "INVITE_EMAIL_MISMATCH",
          403
        );
      }

      // Vérifier qu'il n'est pas déjà membre
      const existing = await db
        .select({ id: farmMembers.id })
        .from(farmMembers)
        .where(
          and(
            eq(farmMembers.farmId, invitation.farmId),
            eq(farmMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!existing[0]) {
        await db.insert(farmMembers).values({
          id: randomUUID(),
          farmId: invitation.farmId,
          userId: ctx.user.id,
          role: invitation.role,
          isActive: true,
        });
      }

      await db
        .update(farmInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(farmInvitations.id, invitation.id));

      const farmRows = await db
        .select()
        .from(farms)
        .where(eq(farms.id, invitation.farmId))
        .limit(1);

      return { farm: farmRows[0], role: invitation.role };
    }),

  // Changer le rôle d'un membre
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        memberId: z.string(),
        role: roleSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      await db
        .update(farmMembers)
        .set({ role: input.role })
        .where(
          and(eq(farmMembers.id, input.memberId), eq(farmMembers.farmId, input.farmId))
        );

      return { success: true };
    }),

  // Activer / désactiver un membre
  toggleMemberActive: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        memberId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      await db
        .update(farmMembers)
        .set({ isActive: input.isActive })
        .where(
          and(eq(farmMembers.id, input.memberId), eq(farmMembers.farmId, input.farmId))
        );

      return { success: true };
    }),

  // Retirer un membre
  removeMember: protectedProcedure
    .input(z.object({ farmId: z.string(), memberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");

      await db
        .delete(farmMembers)
        .where(
          and(eq(farmMembers.id, input.memberId), eq(farmMembers.farmId, input.farmId))
        );

      return { success: true };
    }),

  /**
   * إضافة عضو مباشرة: إنشاء حساب (إن لم يوجد) + عضوية المزرعة
   * بدون كود دعوة — للأستخدام اليومي من صفحة الفريق
   */
  addMemberDirect: protectedProcedure
    .input(
      z.object({
        farmId: z.string(),
        name: z.string().min(2, "الاسم مطلوب"),
        email: z.string().email(),
        password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
        role: roleSchema.default("worker"),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertFarmMember(ctx.user, input.farmId, "farm_manager");
      await assertFarmExists(input.farmId);

      const email = input.email.toLowerCase();
      let user = await findUserByEmail(email);

      if (user) {
        // التحقق أنه ليس عضواً بالفعل
        const existing = await db
          .select({ id: farmMembers.id })
          .from(farmMembers)
          .where(
            and(
              eq(farmMembers.farmId, input.farmId),
              eq(farmMembers.userId, user.id)
            )
          )
          .limit(1);
        if (existing[0]) {
          throw new AppError("هذا المستخدم عضو بالفعل في المزرعة", "ALREADY_MEMBER", 409);
        }
      } else {
        // إنشاء حساب جديد
        const userId = randomUUID();
        const passwordHash = await hashPassword(input.password);
        const globalRole = input.role === "admin" ? "admin" : input.role;

        await db.insert(users).values({
          id: userId,
          name: input.name,
          email,
          passwordHash,
          role: globalRole,
          phone: input.phone,
        });

        user = await findUserByEmail(email);
        if (!user) throw new Error("فشل إنشاء المستخدم");
      }

      const farmRole = input.role === "admin" ? "farm_manager" : input.role;
      const memberId = randomUUID();

      await db.insert(farmMembers).values({
        id: memberId,
        farmId: input.farmId,
        userId: user.id,
        role: farmRole,
        isActive: true,
      });

            // سجل تشغيلي للعامل (بدون حقل بعد — يُعيَّن من صفحة الفريق)
      if (farmRole === "worker") {
        const existingWorker = await db
          .select({ id: workers.id })
          .from(workers)
          .where(
            and(eq(workers.farmId, input.farmId), eq(workers.userId, user.id))
          )
          .limit(1);
        if (!existingWorker[0]) {
          await db.insert(workers).values({
            id: randomUUID(),
            farmId: input.farmId,
            userId: user.id,
            name: user.name,
            phone: input.phone,
            status: "active",
          });
        }
      }

      return {
        memberId,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: farmRole,
      };
    }),

});
