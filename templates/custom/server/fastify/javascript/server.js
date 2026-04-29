const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const helmet = require("@fastify/helmet");
const dotenv = require("dotenv");

dotenv.config();

const port = process.env.PORT || 5000;

// Register plugins
fastify.register(cors);
fastify.register(helmet);

// Routes
fastify.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

// Import routes
// fastify.register(require("./routes/example"), { prefix: "/api/example" });

const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
