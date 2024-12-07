import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import type { Exact } from "type-fest";
import type * as schema from "@/server/db/schema";
import type * as relations from "@/server/db/relations";

export type StringWithAutocompleteOptions<TOptions> = (string & {}) | TOptions;

type Schema = typeof schema;
type Relations = typeof relations;
type SchemaAndRelations = Schema & Relations;
type TablesWithRelations = ExtractTablesWithRelations<SchemaAndRelations>;

type QueryConfig<TableName extends keyof TablesWithRelations> = DBQueryConfig<
  "one" | "many",
  boolean,
  TablesWithRelations,
  TablesWithRelations[TableName]
>;

export type InferQueryModel<
  TableName extends keyof TablesWithRelations,
  QBConfig extends Exact<QueryConfig<TableName>, QBConfig> = {}, // <-- notice Exact here
> = BuildQueryResult<
  TablesWithRelations,
  TablesWithRelations[TableName],
  QBConfig
>;
