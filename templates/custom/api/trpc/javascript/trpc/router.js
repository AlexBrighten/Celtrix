const { initTRPC } = require("@trpc/server");

const t = initTRPC.create();

const router = t.router;
const publicProcedure = t.procedure;

const appRouter = router({
  hello: publicProcedure.query(() => {
    return { message: "Hello from tRPC!" };
  }),
});

module.exports = { appRouter, router, publicProcedure };
// Export type for client: module.exports.AppRouter = appRouter;
