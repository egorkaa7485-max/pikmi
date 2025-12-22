import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { 
  type Game, type InsertGame, type GameState, Suit 
} from "@shared/schema";
import { storage } from "./storage";
import { 
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
