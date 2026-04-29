const { os } = require("@orpc/server");

const pub = os.context();

const appRouter = pub.router({
  hello: pub.handler(() => {
    return { message: "Hello from oRPC!" };
  }),
});

module.exports = { appRouter };
