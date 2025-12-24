import { GameState, Player, Card } from "@shared/schema";
import { storage } from "./storage";
import { broadcastToGame } from "./app";
import { canBeatCard } from "./gameLogic";

const rankValues = {
  "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14,
};

interface BotGame {
  gameId: string;
  botIds: Set<string>;
  joinTimeout?: NodeJS.Timeout;
  leaveTimeout?: NodeJS.Timeout;
  joinedAt: number;
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

  // Schedule first bot join (30-120 seconds)
  const firstDelay = getRandomDelay(30000, 120000);
  botGame.joinTimeout = setTimeout(() => {
    scheduleNextBotJoin(gameId);
  }, firstDelay);

  // Schedule bot leave if game doesn't start (60-240 seconds)
  botGame.leaveTimeout = setTimeout(() => {
    scheduleBotLeave(gameId);
  }, getRandomDelay(60000, 240000));

  botGames.set(gameId, botGame);
}

async function scheduleNextBotJoin(gameId: string): Promise<void> {
  const game = await storage.getGame(gameId);
  if (!game || game.status !== "waiting") {
    return;
  }

  const botGame = botGames.get(gameId);
  if (!botGame) return;

  // Calculate free slots
  const freeSlots = game.maxPlayers - game.playerCount;
  if (freeSlots > 0) {
    const botId = `bot_${gameId}_${botGame.botIds.size}`;
    const botUsername = `Bot_${botGame.botIds.size + 1}`;
    
    // Create bot user
    const botUser = await storage.createUser({
      username: botUsername,
      password: "bot_password",
    });
    
    // Join game with enhanced cards
    const success = await storage.joinGame(gameId, botUser.id, botUsername);
    if (success) {
      botGame.botIds.add(botUser.id);
      botPlayers.add(botUser.id);
      
      // Enhance bot's cards
      await enhanceBotCards(gameId, botUser.id);
      
      const gameState = await storage.getGameState(gameId);
      if (gameState) {
        broadcastToGame(gameId, { type: "game_state", payload: gameState });
      }
    }
  }

  // Schedule next join if slots available
  if (freeSlots > 1 && botGame.botIds.size < freeSlots) {
    const nextDelay = getRandomDelay(30000, 120000);
    botGame.joinTimeout = setTimeout(() => {
      scheduleNextBotJoin(gameId);
    }, nextDelay);
  }
}

async function enhanceBotCards(gameId: string, botId: string): Promise<void> {
  const gameState = await storage.getGameState(gameId);
  if (!gameState) return;

  const botPlayer = gameState.players.find(p => p.id === botId);
  if (!botPlayer) return;

  // Give bot stronger cards - move high-value cards to front
  const { trumpSuit } = gameState;
  botPlayer.cards.sort((a, b) => {
    const aValue = rankValues[a.rank as keyof typeof rankValues] || 0;
    const bValue = rankValues[b.rank as keyof typeof rankValues] || 0;
    
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

  // Remove bots with random delays
  const botIdArray = Array.from(botGame.botIds);
  for (const botId of botIdArray) {
    const delay = getRandomDelay(0, 10000);
    setTimeout(async () => {
      await storage.leaveGame(gameId, botId);
      botPlayers.delete(botId);
      botGame.botIds.delete(botId);
      
      const gameState = await storage.getGameState(gameId);
      if (gameState) {
        broadcastToGame(gameId, { type: "game_state", payload: gameState });
      }
    }, delay);
  }
}

export async function makeBotMove(gameId: string, botId: string): Promise<void> {
  const gameState = await storage.getGameState(gameId);
  if (!gameState) return;

  const botPlayer = gameState.players.find(p => p.id === botId);
  if (!botPlayer || !botPlayer.isBot) return;

  const isAttacker = gameState.currentAttackerId === botId;
  const isDefender = gameState.currentDefenderId === botId;

  if (isAttacker || (gameState.canThrowIn && !isDefender)) {
    // Bot attacks
    performBotAttack(gameState, botId);
  } else if (isDefender) {
    // Bot defends
    performBotDefense(gameState, botId);
  }
}

function performBotAttack(gameState: GameState, botId: string): void {
  const bot = gameState.players.find(p => p.id === botId);
  if (!bot) return;

  // Find strong attacking card
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

  // Prefer high-value cards
  validCards.sort((a, b) => {
    const aValue = rankValues[a.rank as keyof typeof rankValues] || 0;
    const bValue = rankValues[b.rank as keyof typeof rankValues] || 0;
    return bValue - aValue;
  });

  const cardToPlay = validCards[0];
  // This would be sent via WebSocket in real implementation
}

function performBotDefense(gameState: GameState, botId: string): void {
  const bot = gameState.players.find(p => p.id === botId);
  if (!bot) return;

  // Find cards that can beat the attack card
  const lastTableCard = gameState.tableCards[gameState.tableCards.length - 1];
  if (!lastTableCard || lastTableCard.defenseCard) return;

  const beatableCards = bot.cards.filter(card => 
    canBeatCard(lastTableCard.attackCard, card, gameState.trumpSuit)
  );

  if (beatableCards.length === 0) return;

  // Prefer weaker cards that still beat (save strong cards)
  beatableCards.sort((a, b) => {
    const aValue = rankValues[a.rank as keyof typeof rankValues] || 0;
    const bValue = rankValues[b.rank as keyof typeof rankValues] || 0;
    return aValue - bValue;
  });

  const cardToPlay = beatableCards[0];
  // This would be sent via WebSocket in real implementation
}

export function cleanupBotGame(gameId: string): void {
  const botGame = botGames.get(gameId);
  if (!botGame) return;

  if (botGame.joinTimeout) clearTimeout(botGame.joinTimeout);
  if (botGame.leaveTimeout) clearTimeout(botGame.leaveTimeout);
  
  botGame.botIds.forEach(id => botPlayers.delete(id));
  botGames.delete(gameId);
}

export function isBotPlayer(playerId: string): boolean {
  return botPlayers.has(playerId);
}
