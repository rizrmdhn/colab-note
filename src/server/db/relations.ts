import { relations } from "drizzle-orm";
import { session, users } from "./schema";

export const sessionRelations = relations(session, ({ one }) => ({
  users: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));
