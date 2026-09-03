import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";


const app = new Hono();

const frontendOrigins = (
  process.env.FRONTEND_URL ?? "http://localhost:5173"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: env.IS_PRODUCTION ? frontendOrigins : ["http://localhost:5173"],
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

// في الإنتاج: واجهة Vite المبنية من نفس السيرفر
if (env.IS_PRODUCTION) {
  app.use(
    "/*",
    serveStatic({
      root: "./dist/client",
    })
  );
  // SPA fallback
  app.get("*", async (c) => {
    const { readFile } = await import("fs/promises");
    try {
      const html = await readFile("./dist/client/index.html", "utf8");
      return c.html(html);
    } catch {
      return c.text("Frontend not built. Run npm run build.", 500);
    }
  });
}

const port = env.PORT;
console.log(`🌱 Q-Farming 2.0 API على المنفذ ${port} (${env.NODE_ENV})`);

serve({ fetch: app.fetch, port });