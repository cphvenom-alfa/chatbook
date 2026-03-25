import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	pgTableCreator,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => user.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);


// src/server/db/schema.ts
import {
 integer, pgEnum,
  uuid, 
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum    = pgEnum("user_role",    ["user", "admin"]);
export const memberRoleEnum  = pgEnum("member_role",  ["member", "admin", "owner"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "image", "file", "audio"]);
export const chatTypeEnum    = pgEnum("chat_type",    ["direct", "group"]);

// ─── BetterAuth tables ────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull(),
  updatedAt:     timestamp("updated_at").notNull(),
  // Extended
  role:          userRoleEnum("role").default("user").notNull(),
  status:        text("status").default("Hey there! I am using ChatApp."),
  lastSeen:      timestamp("last_seen"),
  isOnline:      boolean("is_online").default(false).notNull(),
});

export const session = pgTable("session", {
  id:          text("id").primaryKey(),
  expiresAt:   timestamp("expires_at").notNull(),
  token:       text("token").notNull().unique(),
  createdAt:   timestamp("created_at").notNull(),
  updatedAt:   timestamp("updated_at").notNull(),
  ipAddress:   text("ip_address"),
  userAgent:   text("user_agent"),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id:                    text("id").primaryKey(),
  accountId:             text("account_id").notNull(),
  providerId:            text("provider_id").notNull(),
  userId:                text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken:           text("access_token"),
  refreshToken:          text("refresh_token"),
  idToken:               text("id_token"),
  accessTokenExpiresAt:  timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("created_at").notNull(),
  updatedAt:             timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at"),
  updatedAt:  timestamp("updated_at"),
});

// ─── Chats ────────────────────────────────────────────────────────────────────

export const chat = pgTable("chat", {
  id:          uuid("id").primaryKey().defaultRandom(),
  type:        chatTypeEnum("type").notNull().default("direct"),
  name:        text("name"),           // only for group chats
  description: text("description"),    // only for group chats
  avatar:      text("avatar"),         // group avatar
  createdBy:   text("created_by").references(() => user.id, { onDelete: "set null" }),
  isEncrypted: boolean("is_encrypted").default(true).notNull(), // dummy flag
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// ─── Chat Members ─────────────────────────────────────────────────────────────

export const chatMember = pgTable("chat_member", {
  id:         uuid("id").primaryKey().defaultRandom(),
  chatId:     uuid("chat_id").notNull().references(() => chat.id, { onDelete: "cascade" }),
  userId:     text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role:       memberRoleEnum("role").default("member").notNull(),
  joinedAt:   timestamp("joined_at").defaultNow().notNull(),
  lastRead:   timestamp("last_read"),   // for unread count
  isMuted:    boolean("is_muted").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────

export const message = pgTable("message", {
  id:          uuid("id").primaryKey().defaultRandom(),
  chatId:      uuid("chat_id").notNull().references(() => chat.id, { onDelete: "cascade" }),
  senderId:    text("sender_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type:        messageTypeEnum("type").default("text").notNull(),
  content:     text("content"),         // text content
  fileUrl:     text("file_url"),        // uploaded file/image URL
  fileName:    text("file_name"),       // original filename
  fileSize:    integer("file_size"),    // bytes
  replyToId:   uuid("reply_to_id"),    // reply to another message
  isEncrypted: boolean("is_encrypted").default(true).notNull(), // dummy flag
  isDeleted:   boolean("is_deleted").default(false).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// ─── Message Reads ────────────────────────────────────────────────────────────

export const messageRead = pgTable("message_read", {
  id:        uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => message.id, { onDelete: "cascade" }),
  userId:    text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  readAt:    timestamp("read_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notification = pgTable("notification", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  chatId:    uuid("chat_id").references(() => chat.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => message.id, { onDelete: "cascade" }),
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  isRead:    boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  chatMembers:   many(chatMember),
  sentMessages:  many(message),
  messageReads:  many(messageRead),
  notifications: many(notification),
  createdChats:  many(chat),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  creator:  one(user, { fields: [chat.createdBy], references: [user.id] }),
  members:  many(chatMember),
  messages: many(message),
  notifications: many(notification),
}));

export const chatMemberRelations = relations(chatMember, ({ one }) => ({
  chat: one(chat, { fields: [chatMember.chatId], references: [chat.id] }),
  user: one(user, { fields: [chatMember.userId], references: [user.id] }),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
  chat:    one(chat,    { fields: [message.chatId],   references: [chat.id]    }),
  sender:  one(user,    { fields: [message.senderId], references: [user.id]    }),
  replyTo: one(message, { fields: [message.replyToId], references: [message.id], relationName: "replies" }),
  replies: many(message, { relationName: "replies" }),
  reads:   many(messageRead),
}));

export const messageReadRelations = relations(messageRead, ({ one }) => ({
  message: one(message, { fields: [messageRead.messageId], references: [message.id] }),
  user:    one(user,    { fields: [messageRead.userId],    references: [user.id]    }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user:    one(user,    { fields: [notification.userId],    references: [user.id]    }),
  chat:    one(chat,    { fields: [notification.chatId],    references: [chat.id]    }),
  message: one(message, { fields: [notification.messageId], references: [message.id] }),
}));