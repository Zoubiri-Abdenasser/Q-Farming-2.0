import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.IS_PRODUCTION ? [] : ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

const port = env.PORT;
console.log(`🌱 Q-Farming 2.0 API يعمل على المنفذ ${port}`);

serve({ fetch: app.fetch, port });