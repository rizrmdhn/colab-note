import { env } from "@/env";
import { type RedisOptions } from "ioredis";

// Memurai Config
const memuraiConfig = {
  host: env.MEMURAI_HOST,
  port: parseInt(env.MEMURAI_PORT, 10),
  password: env.MEMURAI_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,
} satisfies RedisOptions;

export default memuraiConfig;
