import memuraiConfig from "@/config/memurai";
import { Redis } from "ioredis";

export const pub = new Redis(memuraiConfig);
export const sub = new Redis(memuraiConfig);

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000; // 1 second

export async function attemptReconnect(
  redis: Redis,
  attempts = 0,
): Promise<boolean> {
  if (attempts >= MAX_RECONNECT_ATTEMPTS) {
    return false;
  }

  try {
    if (!redis.status.includes("ready")) {
      await redis.connect();
    }
    return true;
  } catch (error) {
    console.error(`Reconnection attempt ${attempts + 1} failed:`, error);
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));
    return attemptReconnect(redis, attempts + 1);
  }
}

export function handleReconnection(redis: Redis, channel: string): void {
  void attemptReconnect(redis)
    .then(async (reconnected) => {
      if (reconnected) {
        try {
          await redis.subscribe(channel);
          console.log("Successfully reconnected and resubscribed");
        } catch (error) {
          console.error("Error resubscribing after reconnection:", error);
        }
      } else {
        console.error("Failed to reconnect after maximum attempts");
      }
    })
    .catch((error) => {
      console.error("Error during reconnection:", error);
    });
}
