import type { Context as HonoContext } from "hono";
import { getSessionCookie } from "./lib/cookies";
import { verifySession } from "./lib/http";
import { findUserById } from "./queries/users";
import type { AuthUser } from "../contracts/types";

export async function createContext(c: HonoContext) {
  let user: AuthUser | null = null;

  const token = getSessionCookie(c);
  if (token) {
    const session = await verifySession(token);
    if (session) {
      const dbUser = await findUserById(session.userId);
      if (dbUser && dbUser.isActive) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          avatarUrl: dbUser.avatarUrl,
        };
      }
    }
  }

  return { c, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;