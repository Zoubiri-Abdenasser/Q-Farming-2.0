import type { Role } from "./constants";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
}

export interface SessionPayload {
  userId: string;
  role: Role;
}