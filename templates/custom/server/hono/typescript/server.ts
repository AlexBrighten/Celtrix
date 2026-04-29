import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import dotenv from "dotenv";

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
// import exampleRoutes from "./routes/example";
// app.route("/api/example", exampleRoutes);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Server running on http://localhost:${info.port}`);
});
