import { seed } from "drizzle-seed";
import { users } from "../server/db/schema";
import { seederHelper } from "./helper";

async function main() {
  await seed(seederHelper, { users }, { count: 10 });
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
