import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  coins: integer("coins").notNull().default(500),
  level: integer("level").notNull().default(1),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  avatarUrl: text("avatar_url"),
  rating: integer("rating").notNull().default(1000),
  gamesPlayed: integer("games_played").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeen: integer("last_seen", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const friends = sqliteTable("friends", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  userId: text("user_id").notNull().references(() => users.id),
  friendId: text("friend_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, blocked
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  gameId: text("game_id").notNull().references(() => games.id),
  userId: text("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("text"), // text, emoji, sticker
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const gifts = sqliteTable("gifts", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  fromUserId: text("from_user_id").notNull().references(() => users.id),
  toUserId: text("to_user_id").notNull().references(() => users.id),
  giftType: text("gift_type").notNull(), // sticker, coins
  giftValue: integer("gift_value").notNull(), // amount or sticker ID
  message: text("message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  userId: text("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(), // first_win, 10_wins, 100_wins, etc.
  title: text("title").notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))`),
  stake: integer("stake").notNull(),
  playerCount: integer("player_count").notNull(),
  maxPlayers: integer("max_players").notNull(),
  deckSize: integer("deck_size").notNull(),
  speed: text("speed").notNull(),
  gameType: text("game_type").notNull().default("подкидной"), // подкидной, переводной
  throwMode: text("throw_mode").notNull().default("соседи"), // соседи, все
  variant: text("variant").notNull().default("классика"), // с шулерами, классика
  fairness: text("fairness").notNull().default("ничья"), // честная, ничья
  isPrivate: integer("is_private").notNull().default(0),
  password: text("password"),
  status: text("status").notNull().default("waiting"), // waiting, ready, playing, finished
  creatorId: text("creator_id").notNull(),
  currentTurn: text("current_turn"),
  trumpSuit: text("trump_suit"),
  deck: text("deck"),
  players: text("players"),
  tableCards: text("table_cards"),
  attackerId: text("attacker_id"),
  defenderId: text("defender_id"),
  winnerId: text("winner_id"),
  loserId: text("loser_id"),
  readyTimer: integer("ready_timer"), // seconds remaining for ready countdown
  turnTimer: integer("turn_timer"), // seconds remaining for current turn
  canRematch: integer("can_rematch").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  stake: true,
  maxPlayers: true,
  deckSize: true,
  speed: true,
  gameType: true,
  throwMode: true,
  variant: true,
  fairness: true,
  isPrivate: true,
  password: true,
});

export const insertFriendSchema = createInsertSchema(friends).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertGiftSchema = createInsertSchema(gifts).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  unlockedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type Friend = typeof friends.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  username: string;
  cards: Card[];
  position: number;
  isReady: boolean;
  coins: number;
}

export interface TableCard {
  attackCard: Card;
  defenseCard?: Card;
}

export interface GameState {
  id: string;
  players: Player[];
  deck: Card[];
  trumpSuit: Suit;
  trumpCard?: Card;
  tableCards: TableCard[];
  discardPile: Card[];
  currentAttackerId: string;
  currentDefenderId: string;
  phase: "waiting" | "attacking" | "defending" | "taking" | "finished";
  canThrowIn: boolean;
  stake: number;
}

export const gameTypes = ["подкидной", "переводной"] as const;
export const throwModes = ["соседи", "все"] as const;
export const variants = ["классика"] as const;
export const fairnessModes = ["ничья"] as const;

export type GameType = typeof gameTypes[number];
export type ThrowMode = typeof throwModes[number];
export type Variant = typeof variants[number];
export type FairnessMode = typeof fairnessModes[number];

export const speedOptions = ["slow", "normal"] as const;
export type Speed = typeof speedOptions[number];
