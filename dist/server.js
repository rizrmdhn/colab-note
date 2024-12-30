var _a;
import { createServer } from "node:http";
import next from "next";
import { Server } from "@hocuspocus/server";
const dev = process.env.NODE_ENV !== "production";
const hostname = (_a = process.env.HOSTNAME) !== null && _a !== void 0 ? _a : "localhost";
const nextPort = isNaN(Number(process.env.PORT))
    ? 3000
    : Number(process.env.PORT);
const hocuspocusPort = isNaN(Number(process.env.HOCUSPOCUS_PORT))
    ? 3001
    : Number(process.env.HOCUSPOCUS_PORT);
// Store server instances for clean shutdown
let nextHttpServer;
let hocuspocus;
// Graceful shutdown function
async function gracefulShutdown() {
    console.log("\nStarting graceful shutdown...");
    try {
        // Close Hocuspocus server
        if (hocuspocus) {
            console.log("Closing Hocuspocus server...");
            await hocuspocus.destroy();
        }
        // Close Next.js HTTP server
        if (nextHttpServer) {
            console.log("Closing Next.js HTTP server...");
            await new Promise((resolve, reject) => {
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
    }
    catch (err) {
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
