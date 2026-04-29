const { query, mutation } = require("./_generated/server");
const { v } = require("convex/values");

// Example query
module.exports.list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").collect();
  },
});

// Example mutation
module.exports.create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("tasks", { text: args.text, completed: false });
  },
});
