// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  index,
  pgTableCreator,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `${name}`);

export const users = createTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
    name: varchar("name", { length: 255 }).notNull(),
    username: varchar("username", { length: 255 }).unique().notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    avatar: varchar("avatar", { length: 255 }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .$default(() => sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (users) => {
    return {
      userIdx: index("user_idx").on(users.id),
      emailIndex: index("email_idx").on(users.email),
      usernameIndex: index("username_idx").on(users.username),
      usernameUnique: unique("username_unique").on(users.username),
    };
  },
);

export const session = createTable(
  "sessions",
  {
    id: text("id").primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (session) => {
    return {
      sessionIdIndex: index("session_id_idx").on(session.id),
      userIdIndex: index("user_id_idx").on(session.userId),
    };
  },
);

export const friends = createTable(
  "friends",
  {
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    friendId: uuid("friend_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (friends) => {
    return {
      userIdIndex: index("friends_user_id_idx").on(friends.userId),
      friendIdIndex: index("friends_friend_id_idx").on(friends.friendId),
    };
  },
);

export const blocked = createTable(
  "blocked",
  {
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    blockedId: uuid("blocked_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (blocked) => {
    return {
      userIdIndex: index("blocked_user_id_idx").on(blocked.userId),
      blockedIdIndex: index("blocked_blocked_id_idx").on(blocked.blockedId),
    };
  },
);

export const friendRequests = createTable(
  "friend_requests",
  {
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    friendId: uuid("friend_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (friendRequests) => {
    return {
      userIdIndex: index("friend_requests_user_id_idx").on(
        friendRequests.userId,
      ),
      friendIdIndex: index("friend_requests_friend_id_idx").on(
        friendRequests.friendId,
      ),
    };
  },
);
