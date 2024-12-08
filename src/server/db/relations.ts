import { relations } from "drizzle-orm";
import {
  blocked,
  friendRequests,
  friends,
  messages,
  session,
  users,
} from "./schema";

export const sessionRelations = relations(session, ({ one }) => ({
  users: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const friendRelations = relations(friends, ({ one }) => ({
  users: one(users, {
    fields: [friends.userId],
    references: [users.id],
  }),
  friends: one(users, {
    fields: [friends.friendId],
    references: [users.id],
  }),
}));

export const blockedRelations = relations(blocked, ({ one }) => ({
  users: one(users, {
    fields: [blocked.userId],
    references: [users.id],
  }),
  blocked: one(users, {
    fields: [blocked.blockedId],
    references: [users.id],
  }),
}));

export const friendRequestRelations = relations(friendRequests, ({ one }) => ({
  users: one(users, {
    fields: [friendRequests.userId],
    references: [users.id],
  }),
  friends: one(users, {
    fields: [friendRequests.friendId],
    references: [users.id],
  }),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  users: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  friends: one(users, {
    fields: [messages.friendId],
    references: [users.id],
  }),
}));
