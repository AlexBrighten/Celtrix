import { clerkMiddleware } from "@clerk/express";

/**
 * Clerk auth middleware for Express.
 * Add to your server: app.use(clerkAuth());
 */
export function clerkAuth() {
  return clerkMiddleware();
}
