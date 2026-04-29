async function exampleRoutes(fastify) {
  fastify.get("/", async () => {
    return { message: "Example route works!" };
  });
}

module.exports = exampleRoutes;
