import { sql } from "drizzle-orm";
import { seederHelper } from "./helper"; // Adjust path to your db config file

async function dropAllTables() {
  try {
    // Get all table names from your schema
    const query = sql`
		-- Delete all tables
		DO $$ DECLARE
		    r RECORD;
		BEGIN
		    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
		        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
		    END LOOP;
		END $$;
		
		-- Delete enums
		DO $$ DECLARE
			r RECORD;
		BEGIN
			FOR r IN (select t.typname as enum_name
			from pg_type t 
				join pg_enum e on t.oid = e.enumtypid  
				join pg_catalog.pg_namespace n ON n.oid = t.typnamespace
			where n.nspname = current_schema()) LOOP
				EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.enum_name);
			END LOOP;
		END $$;
		
		`;

    // Drop all tables using your existing seederHelper
    await seederHelper.execute(query);

    console.log("Successfully dropped all tables");
  } catch (error) {
    console.error("Error dropping tables:", error);
    throw error;
  }
}

// Run the function
dropAllTables()
  .then(() => {
    console.log("Completed dropping tables");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to drop tables:", err);
    process.exit(1);
  });
