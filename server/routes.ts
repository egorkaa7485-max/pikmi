import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { 
  users, friends, chatMessages, gifts, achievements, games,
  type User, type InsertUser, 
  type Friend, type ChatMessage, type Gift, type Achievement,
  type Game, type InsertGame, type GameState, 
  type Player, type Card, type TableCard, Suit 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  initializeGameState, 
  playAttackCard, 
  playDefenseCard, 
  takeCards, 
  beat 
} from "./gameLogic";

// WebSocket connections mapped by game ID
const gameConnections = new Map<string, Map<string, WebSocket>>();

export function broadcastToGame(gameId: string, message: any) {
  const connections = gameConnections.get(gameId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(messageStr);
      }
    });
  }
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Games
  getGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame, creatorId: string): Promise<Game>;
  updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;
  
  // Game State (in-memory for real-time gameplay)
  getGameState(gameId: string): Promise<GameState | undefined>;
  updateGameState(gameId: string, state: Partial<GameState>): Promise<GameState | undefined>;
  
  // Game Actions
  joinGame(gameId: string, userId: string, username: string): Promise<boolean>;
  leaveGame(gameId: string, userId: string): Promise<boolean>;
  setPlayerReady(gameId: string, playerId: string, isReady: boolean): Promise<void>;
  kickPlayer(gameId: string, playerId: string): Promise<void>;
  
  // Friends
  getFriends(userId: string): Promise<Friend[]>;
  addFriend(userId: string, friendId: string): Promise<Friend>;
  updateFriendStatus(id: string, status: string): Promise<Friend | undefined>;
  
  // Chat
  getChatMessages(gameId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: Omit<ChatMessage, "id" | "createdAt">): Promise<ChatMessage>;
  
  // Gifts
  getUserGifts(userId: string): Promise<Gift[]>;
  sendGift(gift: Omit<Gift, "id" | "createdAt">): Promise<Gift>;
  
  // Achievements
  getUserAchievements(userId: string): Promise<Achievement[]>;
  unlockAchievement(achievement: Omit<Achievement, "id" | "unlockedAt">): Promise<Achievement>;
}

export class DatabaseStorage implements IStorage {
  // In-memory storage for active game states (real-time)
  private gameStates: Map<string, GameState>;
  
  constructor() {
    this.gameStates = new Map();
  }
  
  // ===== USERS =====
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  // ===== GAMES =====

  async getGames(): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.status, "waiting"))
      .orderBy(desc(games.createdAt));
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async createGame(game: InsertGame, creatorId: string): Promise<Game> {
    const [newGame] = await db
      .insert(games)
      .values({
        ...game,
        playerCount: 1,
        status: "waiting",
        creatorId,
      })
      .returning();
    return newGame;
  }

  async updateGame(id: string, updates: Partial<Game>): Promise<Game | undefined> {
    const [updated] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    const result = await db.delete(games).where(eq(games.id, id));
    this.gameStates.delete(id);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ===== GAME STATE (in-memory for performance) =====

  async getGameState(gameId: string): Promise<GameState | undefined> {
    return this.gameStates.get(gameId);
  }

  async updateGameState(gameId: string, state: Partial<GameState>): Promise<GameState | undefined> {
    const currentState = this.gameStates.get(gameId);
    if (!currentState) return undefined;

    const updated = { ...currentState, ...state };
    this.gameStates.set(gameId, updated);
    return updated;
  }

  // ===== GAME ACTIONS =====

  async joinGame(gameId: string, userId: string, username: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game || game.playerCount >= game.maxPlayers) {
      return false;
    }

    await this.updateGame(gameId, { 
      playerCount: game.playerCount + 1 
    });
    return true;
  }

  async leaveGame(gameId: string, userId: string): Promise<boolean> {
    const game = await this.getGame(gameId);
    if (!game) return false;

    await this.updateGame(gameId, { 
      playerCount: Math.max(1, game.playerCount - 1) 
    });
    return true;
  }

  async setPlayerReady(gameId: string, playerId: string, isReady: boolean): Promise<void> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    const playerIdx = gameState.players.findIndex(p => p.id === playerId);
    if (playerIdx !== -1) {
      gameState.players[playerIdx].isReady = isReady;
      await this.updateGameState(gameId, gameState);
    }
  }

  async kickPlayer(gameId: string, playerId: string): Promise<void> {
    const gameState = await this.getGameState(gameId);
    if (!gameState) return;

    gameState.players = gameState.players.filter(p => p.id !== playerId);
    await this.updateGameState(gameId, gameState);
  }

  // ===== FRIENDS =====

  async getFriends(userId: string): Promise<Friend[]> {
    return await db
      .select()
      .from(friends)
      .where(eq(friends.userId, userId))
      .orderBy(desc(friends.createdAt));
  }

  async addFriend(userId: string, friendId: string): Promise<Friend> {
    const [friend] = await db
      .insert(friends)
      .values({ userId, friendId, status: "pending" })
      .returning();
    return friend;
  }

  async updateFriendStatus(id: string, status: string): Promise<Friend | undefined> {
    const [updated] = await db
      .update(friends)
      .set({ status })
      .where(eq(friends.id, id))
      .returning();
    return updated || undefined;
  }

  // ===== CHAT =====

  async getChatMessages(gameId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.gameId, gameId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(message: Omit<ChatMessage, "id" | "createdAt">): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  // ===== GIFTS =====

  async getUserGifts(userId: string): Promise<Gift[]> {
    return await db
      .select()
      .from(gifts)
      .where(eq(gifts.toUserId, userId))
      .orderBy(desc(gifts.createdAt));
  }

  async sendGift(gift: Omit<Gift, "id" | "createdAt">): Promise<Gift> {
    const [newGift] = await db
      .insert(gifts)
      .values(gift)
      .returning();
    return newGift;
  }

  // ===== ACHIEVEMENTS =====

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.unlockedAt));
  }

  async unlockAchievement(achievement: Omit<Achievement, "id" | "unlockedAt">): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }
}

// Remove duplicate storage export - use the one from storage.ts

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // WebSocket connection handling
  wss.on("connection", (ws: WebSocket) => {
    let currentGameId: string | null = null;
    let currentUserId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join_game": {
            const { gameId, userId, username } = message;
            currentGameId = gameId;
            currentUserId = userId;

            // Add connection to game
            if (!gameConnections.has(gameId)) {
              gameConnections.set(gameId, new Map());
            }
            gameConnections.get(gameId)!.set(userId, ws);

            // Join game in storage
            await storage.joinGame(gameId, userId, username);
            
            const gameState = await storage.getGameState(gameId);
            if (gameState) {
              broadcastToGame(gameId, { type: "game_state", data: gameState });
            }
            break;
          }

          case "leave_game": {
            if (currentGameId && currentUserId) {
              await storage.leaveGame(currentGameId, currentUserId);
              gameConnections.get(currentGameId)?.delete(currentUserId);
              
              const gameState = await storage.getGameState(currentGameId);
              if (gameState) {
                broadcastToGame(currentGameId, { type: "game_state", data: gameState });
              }
            }
            break;
          }

          case "play_card": {
            if (!currentGameId || !currentUserId) break;
            const { card, tableCardIndex, action } = message;
            
            let gameState = await storage.getGameState(currentGameId);
            if (!gameState) break;

            let result;
            if (action === "attack") {
              result = playAttackCard(gameState, currentUserId, card);
            } else if (action === "defend") {
              result = playDefenseCard(gameState, currentUserId, card, tableCardIndex);
            }

            if (result && !("error" in result)) {
              await storage.updateGameState(currentGameId, result);
              broadcastToGame(currentGameId, { type: "game_state", data: result });
            } else if (result && "error" in result) {
              ws.send(JSON.stringify({ type: "error", message: result.error }));
            }
            break;
          }

          case "take_cards": {
            if (!currentGameId || !currentUserId) break;
            
            const gameState = await storage.getGameState(currentGameId);
            if (!gameState) break;

            const result = takeCards(gameState, currentUserId);
            if (!("error" in result)) {
              await storage.updateGameState(currentGameId, result);
              broadcastToGame(currentGameId, { type: "game_state", data: result });
            } else {
              ws.send(JSON.stringify({ type: "error", message: result.error }));
            }
            break;
          }

          case "beat": {
            if (!currentGameId || !currentUserId) break;
            
            const gameState = await storage.getGameState(currentGameId);
            if (!gameState) break;

            const result = beat(gameState, currentUserId);
            if (!("error" in result)) {
              await storage.updateGameState(currentGameId, result);
              broadcastToGame(currentGameId, { type: "game_state", data: result });
            } else {
              ws.send(JSON.stringify({ type: "error", message: result.error }));
            }
            break;
          }

          case "chat_message": {
            if (!currentGameId || !currentUserId) break;
            const { content } = message;
            
            await storage.createChatMessage({
              gameId: currentGameId,
              userId: currentUserId,
              message: content,
              type: "text",
            });
            
            broadcastToGame(currentGameId, { 
              type: "chat_message", 
              data: { userId: currentUserId, message: content } 
            });
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on("close", async () => {
      if (currentGameId && currentUserId) {
        await storage.leaveGame(currentGameId, currentUserId);
        gameConnections.get(currentGameId)?.delete(currentUserId);
        
        const gameState = await storage.getGameState(currentGameId);
        if (gameState) {
          broadcastToGame(currentGameId, { type: "game_state", data: gameState });
        }
      }
    });
  });

  // REST API Routes
  
  // Games
  app.get("/api/games", async (req, res) => {
    try {
      const gamesList = await storage.getGames();
      res.json(gamesList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const { maxPlayers, deckSize, stake, creatorId, speed, gameType, throwMode, variant, fairness, isPrivate, password } = req.body;
      const game = await storage.createGame(
        { 
          maxPlayers, 
          deckSize, 
          stake, 
          speed: speed || "normal",
          gameType: gameType || "подкидной",
          throwMode: throwMode || "соседи",
          variant: variant || "классика",
          fairness: fairness || "ничья",
          isPrivate: isPrivate || false,
          password
        },
        creatorId
      );
      res.status(201).json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      await storage.deleteGame(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  // Users
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  return httpServer;
}
