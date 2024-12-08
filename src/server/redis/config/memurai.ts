import { env } from "@/env";
import { Redis, type RedisOptions } from "ioredis";

// Memurai default configuration
const memuraiConfig = {
  host: env.MEMURAI_HOST,
  port: env.MEMURAI_PORT,
  password: env.MEMURAI_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
  // Add Memurai-specific settings if needed
} satisfies RedisOptions;

// Create Memurai client
const memurai = new Redis(memuraiConfig);

// Error handling
memurai.on("error", (error) => {
  console.error("Memurai connection error:", error);
});

memurai.on("connect", () => {
  console.log("Successfully connected to Memurai");
});

export default memurai;
