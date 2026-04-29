const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./data.db",
  },
});
