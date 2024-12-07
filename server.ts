import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3001;

// Store server instances for clean shutdown
let httpServer: ReturnType<typeof createServer>;
let io: Server;

// Graceful shutdown function
async function gracefulShutdown() {
  console.log("\nStarting graceful shutdown...");

  try {
    // Close Socket.IO connections
    if (io) {
      console.log("Closing Socket.IO connections...");
      await io.close();
    }

    // Close HTTP server
    if (httpServer) {
      console.log("Closing HTTP server...");
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            console.error("Error closing HTTP server:", err);
            reject(err);
            return;
          }
          console.log("HTTP server closed");
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
const app = next({ dev, hostname, port, turbo: true });
const handler = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    httpServer = createServer((req, res) => {
      handler(req, res).catch((err) => {
        console.error(err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      });
    });

    io = new Server(httpServer);

    io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });

      socket.on("chat_message", (message) => {
        console.log(`Message from ${socket.id}: ${message}`);
        io.emit("chat_message", message);
      });

      socket.on("cursor_move", (cursorData) => {
        // Broadcast cursor position to all other clients
        socket.broadcast.emit("cursor_update", cursorData);
      });
    });

    // Handle server errors
    httpServer.once("error", (err) => {
      console.error("Server error:", err);
      void gracefulShutdown();
    });

    // Start server
    httpServer.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
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
