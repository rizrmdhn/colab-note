// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { AVALIABLE_COLLABORATOR_TYPE } from "@/lib/constants";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTableCreator,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { Node } from "slate";
import { v7 as uuidv7 } from "uuid";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `${name}`);

export const statusEnum = pgEnum("type", AVALIABLE_COLLABORATOR_TYPE);

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
    return [
      index("user_idx").on(users.id),
      index("email_idx").on(users.email),
      index("username_idx").on(users.username),
      unique("username_unique").on(users.username),
      index("search_user_idx").using(
        "gin",
        sql`(
        setweight(to_tsvector('english', ${users.name}), 'A') ||
        setweight(to_tsvector('english', ${users.username}), 'B')
        )`,
      ),
    ];
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
    return [
      index("session_id_idx").on(session.id),
      index("user_id_idx").on(session.userId),
    ];
  },
);

export const friends = createTable(
  "friends",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
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
    return [
      index("friends_id_idx").on(friends.id),
      index("friends_user_id_idx").on(friends.userId),
      index("friends_friend_id_idx").on(friends.friendId),
    ];
  },
);

export const blocked = createTable(
  "blocked",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
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
    return [
      index("blocked_id_idx").on(blocked.id),
      index("blocked_user_id_idx").on(blocked.userId),
      index("blocked_blocked_id_idx").on(blocked.blockedId),
    ];
  },
);

export const friendRequests = createTable(
  "friend_requests",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
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
    return [
      index("friend_requests_id_idx").on(friendRequests.id),
      index("friend_requests_user_id_idx").on(friendRequests.userId),
      index("friend_requests_friend_id_idx").on(friendRequests.friendId),
    ];
  },
);

export const messages = createTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
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
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    isUpdated: boolean("is_updated").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (messages) => {
    return [
      index("messages_id_idx").on(messages.id),
      index("messages_user_id_idx").on(messages.userId),
      index("messages_friend_id_idx").on(messages.friendId),
    ];
  },
);

export const notes = createTable(
  "notes",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: jsonb("content").$type<Node[]>().notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (notes) => {
    return [
      index("notes_id_idx").on(notes.id),
      index("notes_user_id_idx").on(notes.userId),
    ];
  },
);

export const noteCollaborators = createTable(
  "note_collaborators",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .$default(() => uuidv7()),
    noteId: uuid("note_id")
      .references(() => notes.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, {
        onDelete: "cascade",
      })
      .notNull(),
    type: statusEnum("type").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
  },
  (noteCollaborators) => {
    return [
      index("note_collaborators_id_idx").on(noteCollaborators.id),
      index("note_collaborators_note_id_idx").on(noteCollaborators.noteId),
      index("note_collaborators_user_id_idx").on(noteCollaborators.userId),
    ];
  },
);
