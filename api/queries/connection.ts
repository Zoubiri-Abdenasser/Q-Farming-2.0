import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "../../db/schema";
import * as relations from "../../db/relations";

const pool = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: 10,
});

export const db = drizzle(pool, { schema: { ...schema, ...relations }, mode: "default" });