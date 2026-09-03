function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`متغير البيئة المطلوب مفقود: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return requireEnv("DATABASE_URL");
  },
  get JWT_SECRET() {
    return requireEnv("JWT_SECRET");
  },
  get PORT() {
    return Number(process.env.PORT ?? 3000);
  },
  get NODE_ENV() {
    return process.env.NODE_ENV ?? "development";
  },
  get IS_PRODUCTION() {
    return process.env.NODE_ENV === "production";
  },
};