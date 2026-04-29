import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  // Configure your database adapter here
  // database: ...
});
