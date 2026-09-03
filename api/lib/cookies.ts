import type { Context } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../contracts/constants";
import { env } from "./env";

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE_NAME);
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
}