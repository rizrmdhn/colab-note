import type Redis from "ioredis";

class RedisSubscriptionManager<T> {
  private redis: Redis;
  private channel: string;
  private userId: string;
  private isSubscribed = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private readonly reconnectDelay = 1000;
  private messageHandler?: (message: T) => void;
  private reconnectTimeout?: NodeJS.Timeout;
  private isCleanupInitiated = false;
  private isCleaned = false;
  private cleanupPromise: Promise<void> | null = null;

  // Track instances by userId and channel
  private static instances = new Map<string, RedisSubscriptionManager<any>>();
  private static cleanupInProgress = false;

  private constructor(redis: Redis, channel: string, userId: string) {
    if (!userId) {
      throw new Error("userId is required");
    }
    this.redis = redis;
    this.channel = channel;
    this.userId = userId;
    this.setupErrorHandler();
    this.setupConnectionListeners();
  }

  // Factory method to get or create instance
  static getInstance<T>(
    redis: Redis,
    channel: string,
    userId: string,
  ): RedisSubscriptionManager<T> {
    if (!userId) {
      throw new Error(
        "userId is required for RedisSubscriptionManager.getInstance",
      );
    }

    const key = `${userId}:${channel}`;

    let instance = RedisSubscriptionManager.instances.get(key);

    if (!instance || instance.isCleaned) {
      instance = new RedisSubscriptionManager<T>(redis, channel, userId);
      RedisSubscriptionManager.instances.set(key, instance);
      console.log(
        `Created new subscription instance for user ${userId} channel ${channel}`,
      );
    } else {
      console.log(
        `Reusing existing subscription instance for user ${userId} channel ${channel}`,
      );
    }

    return instance as RedisSubscriptionManager<T>;
  }

  private isConnectionActive(): boolean {
    try {
      return (
        this.redis.status === "ready" ||
        this.redis.status === "connect" ||
        this.redis.status === "connecting"
      );
    } catch {
      return false;
    }
  }

  static async cleanupAll(): Promise<void> {
    if (RedisSubscriptionManager.cleanupInProgress) {
      console.log("Global cleanup already in progress, skipping...");
      return;
    }

    RedisSubscriptionManager.cleanupInProgress = true;
    try {
      console.log(
        `Cleaning up ${RedisSubscriptionManager.instances.size} Redis connections...`,
      );
      await Promise.all(
        Array.from(RedisSubscriptionManager.instances.values()).map(
          (instance) =>
            instance.cleanup().catch((err) => {
              console.error(
                `Error cleaning up Redis instance for user ${instance.userId} channel ${instance.channel}:`,
                err,
              );
            }),
        ),
      );
      RedisSubscriptionManager.instances.clear();
    } finally {
      RedisSubscriptionManager.cleanupInProgress = false;
    }
  }

  // Cleanup specific user's connections
  static async cleanupUser(userId: string): Promise<void> {
    const userInstances = Array.from(
      RedisSubscriptionManager.instances.entries(),
    ).filter(([key]) => key.startsWith(`${userId}:`));

    await Promise.all(
      userInstances.map(async ([key, instance]) => {
        try {
          await instance.cleanup();
          RedisSubscriptionManager.instances.delete(key);
        } catch (err) {
          console.error(
            `Error cleaning up instance for user ${userId} channel ${instance.channel}:`,
            err,
          );
        }
      }),
    );
  }

  private attemptReconnect(redis: Redis): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        resolve(false);
        return;
      }

      this.reconnectAttempts++;
      console.log(
        `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      );

      if (redis.status === "ready") {
        this.reconnectAttempts = 0;
        resolve(true);
        return;
      }

      redis
        .connect()
        .then(async () => {
          const connected = await this.waitForConnection();
          if (connected) {
            this.reconnectAttempts = 0;
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => {
          const delay =
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
          }
          this.reconnectTimeout = setTimeout(() => {
            void this.attemptReconnect(redis).then(resolve);
          }, delay);
        });
    });
  }

  private handleReconnection(redis: Redis, channel: string): void {
    if (this.isCleanupInitiated || this.isCleaned) {
      return;
    }

    void this.attemptReconnect(redis)
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

  private setupConnectionListeners(): void {
    this.redis.on("end", () => {
      console.log(`Redis connection ended for channel ${this.channel}`);
      if (!this.isCleanupInitiated && !this.isCleaned) {
        this.handleReconnection(this.redis, this.channel);
      }
    });

    this.redis.on("ready", () => {
      console.log(`Redis connection ready for channel ${this.channel}`);
      if (this.isSubscribed && !this.isCleanupInitiated && !this.isCleaned) {
        void this.resubscribe().catch((err) => {
          console.error(
            `Resubscription error for channel ${this.channel}:`,
            err,
          );
        });
      }
    });
  }

  private setupErrorHandler(): void {
    this.redis.on("error", (error: Error) => {
      console.error(
        `Redis connection error for channel ${this.channel}:`,
        error,
      );
      if (!this.isCleanupInitiated && !this.isCleaned) {
        this.handleReconnection(this.redis, this.channel);
      }
    });
  }

  private async waitForConnection(): Promise<boolean> {
    if (this.redis.status === "ready") {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000); // 5 second timeout

      const readyHandler = () => {
        cleanup();
        resolve(true);
      };

      const errorHandler = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.redis.removeListener("ready", readyHandler);
        this.redis.removeListener("error", errorHandler);
      };

      this.redis.once("ready", readyHandler);
      this.redis.once("error", errorHandler);
    });
  }

  onMessage(handler: (message: T) => void): void {
    this.messageHandler = handler;
  }

  async subscribe(): Promise<void> {
    if (this.isCleanupInitiated || this.isCleaned) {
      throw new Error("Cannot subscribe after cleanup");
    }

    try {
      // Wait for connection before subscribing
      const connected = await this.waitForConnection();
      if (!connected) {
        throw new Error("Failed to connect to Redis");
      }

      this.isCleanupInitiated = false;
      await this.redis.subscribe(this.channel);
      this.isSubscribed = true;

      const messageHandler = (channel: string, message: string) => {
        if (
          channel === this.channel &&
          this.messageHandler &&
          !this.isCleaned
        ) {
          try {
            const parsedMessage = JSON.parse(message) as T;
            this.messageHandler(parsedMessage);
          } catch (error) {
            console.error(
              `Error parsing message for channel ${this.channel}:`,
              error,
            );
          }
        }
      };

      this.redis.on("message", messageHandler);
      console.log(`Subscribed to channel ${this.channel}`);
    } catch (error) {
      console.error(`Subscription error for channel ${this.channel}:`, error);
      if (!this.isCleanupInitiated && !this.isCleaned) {
        this.handleReconnection(this.redis, this.channel);
      }
      throw error;
    }
  }

  private async resubscribe(): Promise<void> {
    if (!this.isSubscribed || this.isCleanupInitiated || this.isCleaned) {
      return;
    }

    try {
      const connected = await this.waitForConnection();
      if (!connected) {
        throw new Error("Failed to connect to Redis");
      }

      await this.redis.subscribe(this.channel);
      console.log(`Resubscribed to channel ${this.channel}`);
    } catch (error) {
      console.error(`Resubscription error for channel ${this.channel}:`, error);
      this.handleReconnection(this.redis, this.channel);
    }
  }

  private async forceCleanup(): Promise<void> {
    try {
      this.redis.disconnect();
    } catch {
      // Ignore disconnect errors
    } finally {
      this.isSubscribed = false;
      this.isCleaned = true;
      const key = `${this.userId}:${this.channel}`;
      RedisSubscriptionManager.instances.delete(key);
    }
  }

  async cleanup(): Promise<void> {
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    if (this.isCleaned) {
      return;
    }

    this.isCleanupInitiated = true;
    console.log(
      `Starting cleanup for user ${this.userId} channel ${this.channel}`,
    );

    this.cleanupPromise = (async () => {
      try {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = undefined;
        }

        try {
          this.redis.removeAllListeners();
        } catch {
          // Ignore errors when removing listeners
        }

        let isActive = false;
        try {
          isActive = this.isConnectionActive();
        } catch {
          // If we can't check the state, assume it's not active
        }

        if (isActive) {
          if (this.isSubscribed) {
            try {
              await this.redis.unsubscribe(this.channel);
              this.isSubscribed = false;
            } catch {
              // Ignore unsubscribe errors
            }
          }

          try {
            await this.redis.quit();
          } catch {
            await this.forceCleanup();
          }
        } else {
          await this.forceCleanup();
        }

        const key = `${this.userId}:${this.channel}`;
        RedisSubscriptionManager.instances.delete(key);

        console.log(
          `Cleanup complete for user ${this.userId} channel ${this.channel}`,
        );
      } catch (error) {
        console.error(
          `Cleanup error for user ${this.userId} channel ${this.channel}:`,
          error,
        );
        await this.forceCleanup();
      }
    })();

    return this.cleanupPromise;
  }
}

export default RedisSubscriptionManager;
