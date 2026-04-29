const { clerkMiddleware } = require("@clerk/express");

/**
 * Clerk auth middleware for Express.
 * Add to your server: app.use(clerkAuth());
 */
function clerkAuth() {
  return clerkMiddleware();
}

module.exports = { clerkAuth };
