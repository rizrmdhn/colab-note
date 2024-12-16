import { createServer } from "node:http";
import next from "next";
import { Server } from "@hocuspocus/server";
import RedisSubscriptionManager from "@/server/redis/subscription-manager";
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const nextPort = 3000; // Next.js port
const hocuspocusPort = 3001; // Hocuspocus port

// Store server instances for clean shutdown
let nextHttpServer: ReturnType<typeof createServer>;
let hocuspocus: typeof Server;

// Graceful shutdown function
async function gracefulShutdown() {
  console.log("\nStarting graceful shutdown...");

  try {
    // Clean up Redis connections first
    console.log("Cleaning up Redis connections...");
    await RedisSubscriptionManager.cleanupAll();

    // Close Hocuspocus server
    if (hocuspocus) {
      console.log("Closing Hocuspocus server...");
      await hocuspocus.destroy();
    }

    // Close Next.js HTTP server
    if (nextHttpServer) {
      console.log("Closing Next.js HTTP server...");
      await new Promise<void>((resolve, reject) => {
        nextHttpServer.close((err) => {
          if (err) {
            console.error("Error closing Next.js HTTP server:", err);
            reject(err);
            return;
          }
          console.log("Next.js HTTP server closed");
          resolve();
        });
      });
    }

    console.log("Shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

// Initialize Next.js app
const app = next({
  dev,
  hostname,
  port: nextPort,
  turbo: true,
  turbopack: true,
});
const handler = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    // Start Next.js server
    nextHttpServer = createServer((req, res) => {
      handler(req, res).catch((err) => {
        console.error(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    });

    // Initialize Hocuspocus server
    hocuspocus = Server.configure({
      port: hocuspocusPort,
    });

    // Start the Hocuspocus server
    hocuspocus.listen();

    // Handle Next.js server errors
    nextHttpServer.once("error", (err) => {
      console.error("Next.js Server error:", err);
      void gracefulShutdown();
    });

    // Start Next.js server
    nextHttpServer.listen(nextPort, () => {
      console.log(`> Next.js ready on http://${hostname}:${nextPort}`);
      console.log(`> Hocuspocus ready on http://${hostname}:${hocuspocusPort}`);
    });

    // Register shutdown handlers
    process.on("SIGTERM", () => void gracefulShutdown());
    process.on("SIGINT", () => void gracefulShutdown());
    process.on("SIGHUP", () => void gracefulShutdown());

    // Handle uncaught errors
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      void gracefulShutdown();
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      void gracefulShutdown();
    });
  })
  .catch((err) => {
    console.error("Startup error:", err);
    process.exit(1);
  });
