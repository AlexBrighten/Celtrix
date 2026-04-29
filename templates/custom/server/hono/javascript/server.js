const { Hono } = require("hono");
const { serve } = require("@hono/node-server");
const { cors } = require("hono/cors");
const dotenv = require("dotenv");

dotenv.config();

const app = new Hono();
const port = Number(process.env.PORT) || 5000;

// Middleware
app.use("*", cors());

// Routes
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Import routes
// const exampleRoutes = require("./routes/example");
// app.route("/api/example", exampleRoutes);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`);
});
