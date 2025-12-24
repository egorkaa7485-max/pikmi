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
import { initializeBotGame, cleanupBotGame, cleanupEmptyGame, makeBotMove } from "./botManager";

// Helper function
function getRandomDelay(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

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
          case "chat_message": {
            if (!currentGameId || !currentUserId) break;
            const { content } = message.payload || message;
            
            await storage.createChatMessage({
              gameId: currentGameId,
              userId: currentUserId,
              message: content || "",
              type: "text",
            });
            
            broadcastToGame(currentGameId, { 
              type: "chat_message", 
              payload: { userId: currentUserId, message: content } 
            });
            break;
          }

          case "join_game": {
            const { gameId, userId, username } = message.payload;
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
              broadcastToGame(gameId, { type: "game_state", payload: gameState });
            }
            break;
          }

          case "leave_game": {
            if (currentGameId && currentUserId) {
              await storage.leaveGame(currentGameId, currentUserId);
              gameConnections.get(currentGameId)?.delete(currentUserId);
              
              const gameState = await storage.getGameState(currentGameId);
              if (gameState) {
                broadcastToGame(currentGameId, { type: "game_state", payload: gameState });
              }
            }
            break;
          }

          case "play_card": {
            if (!currentGameId || !currentUserId) break;
            const { card, tableCardIndex, action } = message.payload;
            
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
              broadcastToGame(currentGameId, { type: "game_state", payload: result });
              
              const updatedState = await storage.getGameState(currentGameId);
              if (updatedState) {
                const nextPlayerId = updatedState.phase === "defending" 
                  ? updatedState.currentDefenderId 
                  : updatedState.currentAttackerId;
                const nextPlayer = updatedState.players.find(p => p.id === nextPlayerId);
                if (nextPlayer?.isBot && nextPlayerId) {
                  setTimeout(() => makeBotMove(currentGameId, nextPlayerId), getRandomDelay(500, 2000));
                }
              }
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
              broadcastToGame(currentGameId, { type: "game_state", payload: result });
              await cleanupEmptyGame(currentGameId);
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
              broadcastToGame(currentGameId, { type: "game_state", payload: result });
              await cleanupEmptyGame(currentGameId);
            } else {
              ws.send(JSON.stringify({ type: "error", message: result.error }));
            }
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
      console.error("Fetch games error:", error);
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
      let { maxPlayers, deckSize, stake, creatorId, speed, gameType, throwMode, variant, fairness, isPrivate, password } = req.body;
      
      // If creatorId is missing, try to get or create a guest user
      if (!creatorId) {
        const guestUser = await storage.getUserByUsername("Guest");
        if (guestUser) {
          creatorId = guestUser.id;
        } else {
          const newUser = await storage.createUser({
            username: `Guest_${Math.floor(Math.random() * 10000)}`,
            password: "guest_password",
          });
          creatorId = newUser.id;
        }
      }

      console.log("Creating game with params:", { maxPlayers, deckSize, stake, creatorId, speed, gameType, throwMode, variant, fairness, isPrivate });
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
      
      // Initialize bot system for this game
      await initializeBotGame(game.id);
      
      res.status(201).json(game);
    } catch (error) {
      console.error("Game creation error:", error);
      res.status(500).json({ error: "Failed to create game", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/games/:id/join", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      res.json(gameState);
    } catch (error) {
      console.error("Game join error:", error);
      res.status(500).json({ error: "Failed to join game" });
    }
  });

  app.post("/api/games/:id/attack", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId, card } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const result = playAttackCard(gameState, playerId, card);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      
      await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: "game_state", payload: result });
      res.json(result);
    } catch (error) {
      console.error("Game attack error:", error);
      res.status(500).json({ error: "Failed to play attack card" });
    }
  });

  app.post("/api/games/:id/defend", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId, card, tableCardIndex } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const result = playDefenseCard(gameState, playerId, card, tableCardIndex);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      
      await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: "game_state", payload: result });
      res.json(result);
    } catch (error) {
      console.error("Game defend error:", error);
      res.status(500).json({ error: "Failed to play defense card" });
    }
  });

  app.post("/api/games/:id/take", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const result = takeCards(gameState, playerId);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      
      await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: "game_state", payload: result });
      res.json(result);
    } catch (error) {
      console.error("Game take error:", error);
      res.status(500).json({ error: "Failed to take cards" });
    }
  });

  app.post("/api/games/:id/beat", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const result = beat(gameState, playerId);
      if ("error" in result) {
        return res.status(400).json(result);
      }
      
      await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: "game_state", payload: result });
      res.json(result);
    } catch (error) {
      console.error("Game beat error:", error);
      res.status(500).json({ error: "Failed to beat" });
    }
  });

  app.post("/api/games/:id/ready", async (req, res) => {
    try {
      const gameId = req.params.id;
      const { playerId } = req.body;
      
      const gameState = await storage.getGameState(gameId);
      if (!gameState) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      const player = gameState.players.find((p: any) => p.id === playerId);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      
      (player as any).isReady = true;
      
      const allReady = gameState.players.length === gameState.maxPlayers && 
                     gameState.players.every((p: any) => p.isReady);
      
      if (allReady) {
        gameState.phase = "attacking";
        const game = await storage.getGame(gameId);
        if (game) {
          await storage.updateGame(gameId, { status: "playing", startedAt: new Date() });
        }
      }
      
      await storage.updateGameState(gameId, gameState);
      broadcastToGame(gameId, { type: "game_state", payload: gameState });
      res.json(gameState);
    } catch (error) {
      console.error("Game ready error:", error);
      res.status(500).json({ error: "Failed to mark ready" });
    }
  });

  app.delete("/api/games/:id", async (req, res) => {
    try {
      cleanupBotGame(req.params.id);
      await cleanupEmptyGame(req.params.id);
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
