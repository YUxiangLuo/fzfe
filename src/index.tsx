import { serve } from "bun";
import shiyan from "./shiyan/shiyan.html";
import jiaoshi from "./jiaoshi/jiaoshi.html";
import login from "./login/login.html";

const server = serve({
  routes: {
    "/*": login,
    "/login": login,

    "/jiaoshi": jiaoshi,

    "/shiyan": shiyan,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
