import { GameState, Player, Card } from "@shared/schema";
import { storage } from "./storage";
import { broadcastToGame } from "./routes";
import { canBeatCard } from "./gameLogic";

const rankValues: Record<string, number> = {
  "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14,
};

interface BotGame {
  gameId: string;
  botIds: Set<string>;
  joinTimeout?: NodeJS.Timeout;
  leaveTimeout?: NodeJS.Timeout;
  joinedAt: number;
  moveTimeout?: NodeJS.Timeout;
}

const botGames = new Map<string, BotGame>();
const botPlayers = new Set<string>();

function getRandomDelay(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export async function initializeBotGame(gameId: string): Promise<void> {
  if (botGames.has(gameId)) return;
  
  const game = await storage.getGame(gameId);
  if (!game) return;

  const botGame: BotGame = {
    gameId,
    botIds: new Set(),
    joinedAt: Date.now(),
  };

  const firstDelay = getRandomDelay(30000, 120000);
  botGame.joinTimeout = setTimeout(() => {
    scheduleNextBotJoin(gameId);
  }, firstDelay);

  const leaveDelay = getRandomDelay(60000, 240000);
  botGame.leaveTimeout = setTimeout(() => {
    scheduleBotLeave(gameId);
  }, leaveDelay);

  botGames.set(gameId, botGame);
}

async function scheduleNextBotJoin(gameId: string): Promise<void> {
  const game = await storage.getGame(gameId);
  if (!game || game.status !== "waiting") {
    return;
  }

  const botGame = botGames.get(gameId);
  if (!botGame) return;

  const freeSlots = game.maxPlayers - game.playerCount;
  if (freeSlots > 0) {
    const botId = `bot_${gameId}_${botGame.botIds.size}`;
    const botUsername = `Бот_${botGame.botIds.size + 1}`;
    
    try {
      const botUser = await storage.createUser({
        username: botUsername,
        password: "bot_password",
      });
      
      const success = await storage.joinGame(gameId, botUser.id, botUsername);
      if (success) {
        botGame.botIds.add(botUser.id);
        botPlayers.add(botUser.id);
        
        await enhanceBotCards(gameId, botUser.id);
        
        const gameState = await storage.getGameState(gameId);
        if (gameState) {
          const playerIndex = gameState.players.findIndex(p => p.id === botUser.id);
          if (playerIndex !== -1) {
            gameState.players[playerIndex].isBot = true;
          }
          broadcastToGame(gameId, { type: "game_state", payload: gameState });
        }
        
        // Always schedule next join if there are still free slots
        const updatedGame = await storage.getGame(gameId);
        if (updatedGame) {
          const remainingSlots = updatedGame.maxPlayers - updatedGame.playerCount;
          if (remainingSlots > 0) {
            const nextDelay = getRandomDelay(30000, 120000);
            botGame.joinTimeout = setTimeout(() => {
              scheduleNextBotJoin(gameId);
            }, nextDelay);
          }
        }
      }
    } catch (error) {
      console.error("Error joining bot:", error);
    }
  }
}

async function enhanceBotCards(gameId: string, botId: string): Promise<void> {
  const gameState = await storage.getGameState(gameId);
  if (!gameState) return;

  const botPlayer = gameState.players.find(p => p.id === botId);
  if (!botPlayer) return;

  const { trumpSuit } = gameState;
  botPlayer.cards.sort((a, b) => {
    const aValue = rankValues[a.rank] || 0;
    const bValue = rankValues[b.rank] || 0;
    
    const aIsTrump = a.suit === trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === trumpSuit ? 1 : 0;
    
    return (bIsTrump - aIsTrump) * 100 + (bValue - aValue);
  });

  await storage.updateGameState(gameId, gameState);
}

async function scheduleBotLeave(gameId: string): Promise<void> {
  const game = await storage.getGame(gameId);
  if (!game || game.status !== "waiting") return;

  const botGame = botGames.get(gameId);
  if (!botGame || botGame.botIds.size === 0) return;

  const botIdArray = Array.from(botGame.botIds);
  for (const botId of botIdArray) {
    const delay = getRandomDelay(0, 10000);
    setTimeout(async () => {
      try {
        await storage.leaveGame(gameId, botId);
        botPlayers.delete(botId);
        botGame.botIds.delete(botId);
        
        const gameState = await storage.getGameState(gameId);
        if (gameState) {
          broadcastToGame(gameId, { type: "game_state", payload: gameState });
        }
        
        await cleanupEmptyGame(gameId);
      } catch (error) {
        console.error("Error leaving bot:", error);
      }
    }, delay);
  }
}

export async function cleanupEmptyGame(gameId: string): Promise<void> {
  try {
    const game = await storage.getGame(gameId);
    if (!game) return;

    const gameState = await storage.getGameState(gameId);
    if (!gameState || gameState.players.length === 0) {
      cleanupBotGame(gameId);
      await storage.deleteGame(gameId);
    }
  } catch (error) {
    console.error("Error cleaning up empty game:", error);
  }
}

export async function makeBotMove(gameId: string, botId: string): Promise<void> {
  const gameState = await storage.getGameState(gameId);
  if (!gameState || gameState.phase === "waiting") return;

  const botPlayer = gameState.players.find(p => p.id === botId);
  if (!botPlayer || !botPlayer.isBot) return;

  const isAttacker = gameState.currentAttackerId === botId;
  const isDefender = gameState.currentDefenderId === botId;

  if (isAttacker || (gameState.canThrowIn && !isDefender)) {
    await performBotAttack(gameId, gameState, botId);
  } else if (isDefender) {
    await performBotDefense(gameId, gameState, botId);
  }
}

async function performBotAttack(gameId: string, gameState: GameState, botId: string): Promise<void> {
  const bot = gameState.players.find(p => p.id === botId);
  if (!bot || bot.cards.length === 0) return;

  const defender = gameState.players.find(p => p.id === gameState.currentDefenderId);
  if (!defender) return;

  const validCards = bot.cards.filter(card => {
    if (gameState.tableCards.length === 0) return true;
    
    const tableRanks: string[] = [];
    for (const tc of gameState.tableCards) {
      tableRanks.push(tc.attackCard.rank);
      if (tc.defenseCard) {
        tableRanks.push(tc.defenseCard.rank);
      }
    }
    
    return tableRanks.includes(card.rank);
  });

  if (validCards.length === 0) return;
  if (gameState.tableCards.length >= defender.cards.length) return;

  validCards.sort((a, b) => {
    const aValue = rankValues[a.rank] || 0;
    const bValue = rankValues[b.rank] || 0;
    
    const aIsTrump = a.suit === gameState.trumpSuit ? 1 : 0;
    const bIsTrump = b.suit === gameState.trumpSuit ? 1 : 0;
    
    return (bIsTrump - aIsTrump) * 100 + (bValue - aValue);
  });

  const cardToPlay = validCards[0];
  
  setTimeout(async () => {
    try {
      const { playAttackCard } = await import("./gameLogic");
      const result = playAttackCard(gameState, botId, cardToPlay);
      
      if (result && !("error" in result)) {
        await storage.updateGameState(gameId, result);
        broadcastToGame(gameId, { type: "game_state", payload: result });
      }
    } catch (error) {
      console.error("Error bot attack:", error);
    }
  }, getRandomDelay(500, 1500));
}

async function performBotDefense(gameId: string, gameState: GameState, botId: string): Promise<void> {
  const bot = gameState.players.find(p => p.id === botId);
  if (!bot || bot.cards.length === 0) return;

  const lastTableCard = gameState.tableCards.find(tc => !tc.defenseCard);
  if (!lastTableCard) {
    setTimeout(async () => {
      try {
        const { beat } = await import("./gameLogic");
        const result = beat(gameState, botId);
        
        if (result && !("error" in result)) {
          await storage.updateGameState(gameId, result);
          broadcastToGame(gameId, { type: "game_state", payload: result });
        }
      } catch (error) {
        console.error("Error bot beat:", error);
      }
    }, getRandomDelay(800, 2000));
    return;
  }

  const beatableCards = bot.cards.filter(card => 
    canBeatCard(lastTableCard.attackCard, card, gameState.trumpSuit)
  );

  if (beatableCards.length === 0) {
    setTimeout(async () => {
      try {
        const { takeCards } = await import("./gameLogic");
        const result = takeCards(gameState, botId);
        
        if (result && !("error" in result)) {
          await storage.updateGameState(gameId, result);
          broadcastToGame(gameId, { type: "game_state", payload: result });
        }
      } catch (error) {
        console.error("Error bot take:", error);
      }
    }, getRandomDelay(1000, 2500));
    return;
  }

  beatableCards.sort((a, b) => {
    const aValue = rankValues[a.rank] || 0;
    const bValue = rankValues[b.rank] || 0;
    return aValue - bValue;
  });

  const cardToPlay = beatableCards[0];
  const tableCardIndex = gameState.tableCards.findIndex(tc => !tc.defenseCard);

  setTimeout(async () => {
    try {
      const { playDefenseCard } = await import("./gameLogic");
      const result = playDefenseCard(gameState, botId, cardToPlay, tableCardIndex);
      
      if (result && !("error" in result)) {
        await storage.updateGameState(gameId, result);
        broadcastToGame(gameId, { type: "game_state", payload: result });
      }
    } catch (error) {
      console.error("Error bot defense:", error);
    }
  }, getRandomDelay(600, 1800));
}

export function cleanupBotGame(gameId: string): void {
  const botGame = botGames.get(gameId);
  if (!botGame) return;

  if (botGame.joinTimeout) clearTimeout(botGame.joinTimeout);
  if (botGame.leaveTimeout) clearTimeout(botGame.leaveTimeout);
  if (botGame.moveTimeout) clearTimeout(botGame.moveTimeout);
  
  botGame.botIds.forEach(id => botPlayers.delete(id));
  botGames.delete(gameId);
}

export function isBotPlayer(playerId: string): boolean {
  return botPlayers.has(playerId);
}
