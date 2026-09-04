import { router, publicProcedure } from "./middleware";
import { authRouter } from "./auth-router";
import { fieldsRouter } from "./routers/fields";
import { workersRouter } from "./routers/workers";
import { usersRouter } from "./routers/users";
import { farmsRouter } from "./routers/farms";
import { calendarRouter } from "./routers/calendar";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  auth: authRouter,
  farms: farmsRouter,
  fields: fieldsRouter,
  workers: workersRouter,
  users: usersRouter,
  calendar: calendarRouter,
});

export type AppRouter = typeof appRouter;
