import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const friends = pgTable("friends", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  friendId: text("friend_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: text("game_id").notNull().references(() => games.id),
  userId: text("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  type: text("type").notNull().default("text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gifts = pgTable("gifts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: text("from_user_id").notNull().references(() => users.id),
  toUserId: text("to_user_id").notNull().references(() => users.id),
  giftType: text("gift_type").notNull(),
  giftValue: integer("gift_value").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  achievementType: text("achievement_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
});

export const games = pgTable("games", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  stake: integer("stake").notNull(),
  playerCount: integer("player_count").notNull(),
  maxPlayers: integer("max_players").notNull(),
  deckSize: integer("deck_size").notNull(),
  speed: text("speed").notNull(),
  gameType: text("game_type").notNull().default("подкидной"),
  throwMode: text("throw_mode").notNull().default("соседи"),
  variant: text("variant").notNull().default("классика"),
  fairness: text("fairness").notNull().default("ничья"),
  isPrivate: boolean("is_private").notNull().default(false),
  password: text("password"),
  status: text("status").notNull().default("waiting"),
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
  readyDeadline: integer("ready_deadline"),
  readyTimer: integer("ready_timer"),
  turnTimer: integer("turn_timer"),
  canRematch: boolean("can_rematch").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

// Insert schemas
export const gameTypes = ["подкидной", "переводной"] as const;
export const throwModes = ["соседи", "все"] as const;
export const variants = ["классика"] as const;
export const fairnessModes = ["ничья"] as const;
export const speedOptions = ["slow", "normal"] as const;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = z.object({
  stake: z.number().positive(),
  maxPlayers: z.number().min(1).max(4),
  deckSize: z.number(),
  speed: z.enum(speedOptions),
  gameType: z.enum(gameTypes),
  throwMode: z.enum(throwModes),
  variant: z.enum(variants),
  fairness: z.enum(fairnessModes),
  isPrivate: z.boolean(),
  password: z.string().optional(),
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
  userId?: string;
  cards: Card[];
  position: number;
  isReady: boolean;
  coins: number;
  isBot?: boolean;
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
  phase: "waiting" | "ready" | "attacking" | "defending" | "taking" | "finished";
  canThrowIn: boolean;
  stake: number;
  maxPlayers: number;
  readyTimer?: number;
}

export type GameType = typeof gameTypes[number];
export type ThrowMode = typeof throwModes[number];
export type Variant = typeof variants[number];
export type FairnessMode = typeof fairnessModes[number];
export type Speed = typeof speedOptions[number];
