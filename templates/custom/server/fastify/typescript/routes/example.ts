import { FastifyInstance } from "fastify";

export default async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    return { message: "Example route works!" };
  });
}
