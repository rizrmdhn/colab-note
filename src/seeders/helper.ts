import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const queryClient = postgres(process.env.DATABASE_URL ?? "");

const seederHelper: PostgresJsDatabase = drizzle(queryClient, {
  logger: true,
});

export { seederHelper };
