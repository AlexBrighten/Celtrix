import { os } from "@orpc/server";

const pub = os.context();

export const appRouter = pub.router({
  hello: pub.handler(() => {
    return { message: "Hello from oRPC!" };
  }),
});

export type AppRouter = typeof appRouter;
