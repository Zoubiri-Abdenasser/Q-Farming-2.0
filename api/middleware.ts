import { initTRPC } from "@trpc/server";
import { Errors } from "../contracts/errors";
import { ROLE_HIERARCHY, type Role } from "../contracts/constants";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw Errors.UNAUTHORIZED();
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);

export function requireRole(minRole: Role) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userLevel = ROLE_HIERARCHY[ctx.user.role];
    const requiredLevel = ROLE_HIERARCHY[minRole];
    if (userLevel < requiredLevel) {
      throw Errors.FORBIDDEN();
    }
    return next({ ctx });
  });
}