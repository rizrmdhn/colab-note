import { seed } from "drizzle-seed";
import { users } from "../server/db/schema";
import { seederHelper } from "./helper";
import { hash } from "@node-rs/argon2";

async function main() {
  const hasedPassword = await hash("test12345");
  await seed(seederHelper, { users }, { count: 20 }).refine((f) => ({
    users: {
      columns: {
        password: f.valuesFromArray({ values: [hasedPassword] }),
      },
    },
  }));
}

main()
  .then(() => {
    console.log("Seeding has been completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error while seeding:", err);
    process.exit(1);
  });
