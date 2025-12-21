import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertGameSchema } from "@shared/schema";
import { initializeGameState, playAttackCard, playDefenseCard, takeCards, beat } from "./gameLogic";

interface WSClient extends WebSocket {
  userId?: string;
  gameId?: string;
  username?: string;
}

// Export the broadcastToGame function so it can be used elsewhere
let broadcastToGameFunc: (gameId: string, message: any, excludeClient?: WSClient) => void;

export function broadcastToGame(gameId: string, message: any, excludeClient?: WSClient) {
  broadcastToGameFunc(gameId, message, excludeClient);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const gameId = req.params.id;
      
      const gameState = await storage.getGameState(gameId);
      if (gameState) {
        return res.json(gameState);
      }

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const creatorId = "temp-user-id";

      const game = await storage.createGame(gameData, creatorId);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid game data", details: error.errors });
      }
      console.error("Error creating game:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.post("/api/games/:id/join", async (req, res) => {
    try {
      const gameId = req.params.id;
      const userId = "temp-user-id";
      const username = `Player${Math.floor(Math.random() * 1000)}`;

      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.status !== "waiting") {
        return res.status(400).json({ error: "Game already started" });
      }

      const joined = await storage.joinGame(gameId, userId, username);
      if (!joined) {
        return res.status(400).json({ error: "Cannot join game" });
      }

      const updatedGame = await storage.getGame(gameId);

      if (updatedGame && updatedGame.playerCount >= 2) {
        const players = Array.from({ length: updatedGame.playerCount }, (_, i) => ({
          id: `player-${i}`,
          username: `Игрок ${i + 1}`,
          coins: 500,
        }));

        const gameState = initializeGameState(
          gameId,
          players,
          updatedGame.deckSize as 24 | 36 | 52,
          updatedGame.stake
        );

        await storage.updateGame(gameId, { status: "playing" });
        
        (storage as any).gameStates.set(gameId, gameState);
        
        return res.json(gameState);
      }

      res.json(updatedGame);
    } catch (error) {
      console.error("Error joining game:", error);
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

      const updatedState = await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: 'gameStateUpdate', data: updatedState || result });
      res.json(updatedState || result);
    } catch (error) {
      console.error("Error playing attack card:", error);
      res.status(500).json({ error: "Failed to play card" });
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

      const updatedState = await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: 'gameStateUpdate', data: updatedState || result });
      res.json(updatedState || result);
    } catch (error) {
      console.error("Error playing defense card:", error);
      res.status(500).json({ error: "Failed to play card" });
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

      const updatedState = await storage.updateGameState(gameId, result);
      res.json(updatedState || result);
    } catch (error) {
      console.error("Error taking cards:", error);
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

      const updatedState = await storage.updateGameState(gameId, result);
      broadcastToGame(gameId, { type: 'gameStateUpdate', data: updatedState || result });
      res.json(updatedState || result);
    } catch (error) {
      console.error("Error beating cards:", error);
      res.status(500).json({ error: "Failed to beat cards" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, Set<WSClient>>();

  broadcastToGameFunc = function(gameId: string, message: any, excludeClient?: WSClient) {
    const gameClients = clients.get(gameId);
    if (!gameClients) return;

    const payload = JSON.stringify(message);
    gameClients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  wss.on('connection', (ws: WSClient) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const { type, payload } = message;

        switch (type) {
          case 'join_game': {
            const { gameId, userId, username } = payload;
            ws.gameId = gameId;
            ws.userId = userId;
            ws.username = username;

            if (!clients.has(gameId)) {
              clients.set(gameId, new Set());
            }
            clients.get(gameId)!.add(ws);

            const joined = await storage.joinGame(gameId, userId, username);
            if (joined) {
              const updatedGame = await storage.getGame(gameId);
              
              // Send current game state if game is already playing
              const existingGameState = await storage.getGameState(gameId);
              if (existingGameState) {
                ws.send(JSON.stringify({
                  type: 'game_update',
                  payload: existingGameState
                }));
              }
              
              broadcastToGame(gameId, {
                type: 'player_joined',
                payload: { userId, username, game: updatedGame }
              }, ws); // Exclude sender from broadcast

              if (updatedGame && updatedGame.playerCount >= 2 && updatedGame.status === "waiting") {
                const players = Array.from({ length: updatedGame.playerCount }, (_, i) => ({
                  id: `player-${i}`,
                  username: `Игрок ${i + 1}`,
                  coins: updatedGame.stake,
                }));

                const gameState = initializeGameState(
                  gameId,
                  players,
                  updatedGame.deckSize as 24 | 36 | 52,
                  updatedGame.stake
                );

                await storage.updateGame(gameId, { status: "playing" });
                (storage as any).gameStates.set(gameId, gameState);

                broadcastToGame(gameId, {
                  type: 'game_started',
                  payload: gameState
                });
              }
            }
            break;
          }

          case 'leave_game': {
            const { gameId, userId } = payload;
            await storage.leaveGame(gameId, userId);
            
            if (ws.gameId) {
              clients.get(ws.gameId)?.delete(ws);
            }

            broadcastToGame(gameId, {
              type: 'player_left',
              payload: { userId }
            }, ws);
            break;
          }

          case 'chat_message': {
            const { gameId, userId, message: chatText } = payload;
            
            const chatMessage = await storage.createChatMessage({
              gameId,
              userId,
              message: chatText
            });

            broadcastToGame(gameId, {
              type: 'chat_message',
              payload: chatMessage
            });
            break;
          }

          case 'attack': {
            const { gameId, playerId, card } = payload;
            const gameState = await storage.getGameState(gameId);
            
            if (gameState) {
              const result = playAttackCard(gameState, playerId, card);
              if (!("error" in result)) {
                await storage.updateGameState(gameId, result);
                broadcastToGame(gameId, {
                  type: 'game_update',
                  payload: result
                });
              }
            }
            break;
          }

          case 'defend': {
            const { gameId, playerId, card, tableCardIndex } = payload;
            const gameState = await storage.getGameState(gameId);
            
            if (gameState) {
              const result = playDefenseCard(gameState, playerId, card, tableCardIndex);
              if (!("error" in result)) {
                await storage.updateGameState(gameId, result);
                broadcastToGame(gameId, {
                  type: 'game_update',
                  payload: result
                });
              }
            }
            break;
          }

          case 'take': {
            const { gameId, playerId } = payload;
            const gameState = await storage.getGameState(gameId);
            
            if (gameState) {
              const result = takeCards(gameState, playerId);
              if (!("error" in result)) {
                await storage.updateGameState(gameId, result);
                broadcastToGame(gameId, {
                  type: 'game_update',
                  payload: result
                });
              }
            }
            break;
          }

          case 'beat': {
            const { gameId, playerId } = payload;
            const gameState = await storage.getGameState(gameId);
            
            if (gameState) {
              const result = beat(gameState, playerId);
              if (!("error" in result)) {
                await storage.updateGameState(gameId, result);
                broadcastToGame(gameId, {
                  type: 'game_update',
                  payload: result
                });
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.gameId) {
        clients.get(ws.gameId)?.delete(ws);
        
        if (ws.userId) {
          broadcastToGame(ws.gameId, {
            type: 'player_left',
            payload: { userId: ws.userId }
          }, ws);
        }
      }
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}