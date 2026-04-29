const { betterAuth } = require("better-auth");

const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  // Configure your database adapter here
  // database: ...
});

module.exports = { auth };
