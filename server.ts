import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createServer } from "http";
import next from "next";
import { parse } from "url";
import ws from "ws";

import conf from "./next.config";
import { createContext } from "./src/server/trpc/context";
import { appRouter } from "./src/server/trpc/router/_app";

const port = parseInt(process.env.PORT ?? "3000", 10);
const dev = process.env.NODE_ENV !== "production";

const hostname = process.env.HOSTNAME ?? "localhost";

const app = next({
  dev,
  port,
  hostname,
  conf,
});

const handle = app.getRequestHandler();

void app.prepare().then(() => {
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      const proto = req.headers["x-forwarded-proto"];
      if (proto && proto === "http") {
        res.writeHead(303, {
          // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          location: `https://` + req.headers.host + (req.headers.url ?? ""),
        });
        res.end();
        return;
      }

      void handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const wss = new ws.Server({ ...(dev ? { noServer: true } : { server }) });

  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext,
  });

  wss.on("connection", function connection(ws) {
    console.log("Incoming websocket connection...");
    ws.on("close", () =>
      console.log("Websocket connection closed", wss.clients.size),
    );
    ws.on("error", (err) => console.error(err));
  });

  if (dev) {
    server.on("upgrade", function (req, socket, head) {
      const { pathname } = parse(req.url ?? "", true);
      if (pathname !== "/_next/webpack-hmr") {
        wss.handleUpgrade(req, socket, head, function done(ws) {
          wss.emit("connection", ws, req);
        });
      }
    });
  }

  server.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Server listening on port ${port}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM");
    handler.broadcastReconnectNotification();
  });
});
