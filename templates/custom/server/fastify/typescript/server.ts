import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dotenv from "dotenv";

dotenv.config();

const fastify = Fastify({ logger: true });
const port = Number(process.env.PORT) || 5000;

// Register plugins
await fastify.register(cors);
await fastify.register(helmet);

// Routes
fastify.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Import routes
// import exampleRoutes from "./routes/example";
// fastify.register(exampleRoutes, { prefix: "/api/example" });

try {
  await fastify.listen({ port, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
