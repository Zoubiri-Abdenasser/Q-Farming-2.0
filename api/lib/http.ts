import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import type { SessionPayload } from "../../contracts/types";

function getSecretKey() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { userId: payload.userId, role: payload.role } as SessionPayload;
  } catch {
    return null;
  }
}