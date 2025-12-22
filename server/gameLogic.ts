import { Card, Suit, Rank, GameState, Player, TableCard } from "@shared/schema";

const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks36: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const ranks24: Rank[] = ["9", "10", "J", "Q", "K", "A"];

const rankValues: Record<Rank, number> = {
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  "J": 11,
  "Q": 12,
  "K": 13,
  "A": 14,
};

export function generateDeck(deckSize: 24 | 36 | 52 = 36): Card[] {
  const deck: Card[] = [];
  const ranksToUse = deckSize === 24 ? ranks24 : ranks36;

  for (const suit of suits) {
    for (const rank of ranksToUse) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${Math.random().toString(36).substring(7)}`,
      });
    }
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function initializeGameState(
  gameId: string,
  players: Array<{ id: string; username: string; coins: number }>,
  deckSize: 24 | 36 | 52,
  stake: number
): GameState {
  const deck = generateDeck(deckSize);
  const trumpCard = deck.pop()!;
  const trumpSuit = trumpCard.suit;

  const gamePlayers: Player[] = players.map((p, index) => ({
    id: p.id,
    username: p.username,
    cards: [],
    position: index,
    isReady: false,
    coins: p.coins,
  }));

  for (const player of gamePlayers) {
    for (let i = 0; i < 6 && deck.length > 0; i++) {
      const card = deck.shift()!;
      player.cards.push(card);
    }
  }

  deck.push(trumpCard);

  const lowestTrumpPlayer = findPlayerWithLowestTrump(gamePlayers, trumpSuit);
  const firstAttacker = lowestTrumpPlayer || gamePlayers[0];

  return {
    id: gameId,
    players: gamePlayers,
    deck,
    trumpSuit,
    trumpCard,
    tableCards: [],
    discardPile: [],
    currentAttackerId: firstAttacker.id,
    currentDefenderId: gamePlayers[(firstAttacker.position + 1) % gamePlayers.length].id,
    phase: "attacking",
    canThrowIn: false,
    stake,
    maxPlayers: players.length,
  };
}

function findPlayerWithLowestTrump(players: Player[], trumpSuit: Suit): Player | null {
  let lowestTrumpPlayer: Player | null = null;
  let lowestTrumpValue = Infinity;

  for (const player of players) {
    for (const card of player.cards) {
      if (card.suit === trumpSuit) {
        const value = rankValues[card.rank];
        if (value < lowestTrumpValue) {
          lowestTrumpValue = value;
          lowestTrumpPlayer = player;
        }
      }
    }
  }

  return lowestTrumpPlayer;
}

export function canBeatCard(attackCard: Card, defenseCard: Card, trumpSuit: Suit): boolean {
  const attackIsTrump = attackCard.suit === trumpSuit;
  const defenseIsTrump = defenseCard.suit === trumpSuit;

  if (!attackIsTrump && defenseIsTrump) {
    return true;
  }

  if (attackCard.suit === defenseCard.suit) {
    return rankValues[defenseCard.rank] > rankValues[attackCard.rank];
  }

  return false;
}

export function playAttackCard(
  gameState: GameState,
  playerId: string,
  card: Card
): GameState | { error: string } {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }

  if (playerId === gameState.currentDefenderId) {
    return { error: "Defender cannot attack" };
  }

  const isMainAttacker = gameState.currentAttackerId === playerId;
  const canThrowIn = gameState.canThrowIn && playerId !== gameState.currentDefenderId;
  
  if (!isMainAttacker && !canThrowIn) {
    return { error: "Not your turn to attack" };
  }

  const cardIndex = player.cards.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    return { error: "Card not in hand" };
  }

  if (gameState.tableCards.length > 0) {
    const tableRanks = gameState.tableCards.flatMap((tc) => [
      tc.attackCard.rank,
      tc.defenseCard?.rank,
    ]).filter((r): r is Rank => r !== undefined);

    if (!tableRanks.includes(card.rank)) {
      return { error: "Card rank doesn't match table cards" };
    }
  }

  const defender = gameState.players.find((p) => p.id === gameState.currentDefenderId);
  if (defender && gameState.tableCards.length >= defender.cards.length) {
    return { error: "Cannot attack with more cards than defender has" };
  }

  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  const newPlayer = newState.players.find((p) => p.id === playerId)!;
  const newCardIndex = newPlayer.cards.findIndex((c) => c.id === card.id);
  
  newPlayer.cards.splice(newCardIndex, 1);

  newState.tableCards.push({
    attackCard: card,
    defenseCard: undefined,
  });

  newState.phase = "defending";
  newState.canThrowIn = false;

  return newState;
}

export function playDefenseCard(
  gameState: GameState,
  playerId: string,
  card: Card,
  tableCardIndex: number
): GameState | { error: string } {
  if (gameState.currentDefenderId !== playerId) {
    return { error: "Not your turn to defend" };
  }

  if (gameState.phase !== "defending") {
    return { error: "Not in defending phase" };
  }

  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }

  const cardIndex = player.cards.findIndex((c) => c.id === card.id);
  if (cardIndex === -1) {
    return { error: "Card not in hand" };
  }

  const tableCard = gameState.tableCards[tableCardIndex];
  if (!tableCard || tableCard.defenseCard) {
    return { error: "Invalid table card" };
  }

  if (!canBeatCard(tableCard.attackCard, card, gameState.trumpSuit)) {
    return { error: "Card cannot beat attack card" };
  }

  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  const newPlayer = newState.players.find((p) => p.id === playerId)!;
  const newCardIndex = newPlayer.cards.findIndex((c) => c.id === card.id);
  
  newPlayer.cards.splice(newCardIndex, 1);
  newState.tableCards[tableCardIndex].defenseCard = card;

  const allBeaten = newState.tableCards.every((tc) => tc.defenseCard !== undefined);
  if (allBeaten) {
    newState.canThrowIn = true;
    newState.phase = "attacking";
  }

  return newState;
}

export function takeCards(gameState: GameState, playerId: string): GameState | { error: string } {
  if (gameState.currentDefenderId !== playerId) {
    return { error: "Not the defender" };
  }

  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  const defender = newState.players.find((p) => p.id === playerId)!;

  for (const tableCard of newState.tableCards) {
    defender.cards.push(tableCard.attackCard);
    if (tableCard.defenseCard) {
      defender.cards.push(tableCard.defenseCard);
    }
  }

  newState.tableCards = [];
  newState.canThrowIn = false;

  drawCardsToPlayers(newState);

  const defenderIndex = defender.position;
  const nextAttackerIndex = (defenderIndex + 1) % newState.players.length;
  const nextDefenderIndex = (nextAttackerIndex + 1) % newState.players.length;

  newState.currentAttackerId = newState.players[nextAttackerIndex].id;
  newState.currentDefenderId = newState.players[nextDefenderIndex].id;
  newState.phase = "attacking";

  return newState;
}

export function beat(gameState: GameState, playerId: string): GameState | { error: string } {
  if (playerId === gameState.currentDefenderId) {
    return { error: "Defender cannot call beat" };
  }

  const isAttacker = gameState.currentAttackerId === playerId;
  const canAct = isAttacker || (gameState.canThrowIn && gameState.players.some(p => p.id === playerId));
  
  if (!canAct) {
    return { error: "Not authorized to call beat" };
  }

  const allBeaten = gameState.tableCards.every((tc) => tc.defenseCard !== undefined);
  if (!allBeaten) {
    return { error: "Not all cards beaten" };
  }

  const newState: GameState = JSON.parse(JSON.stringify(gameState));

  for (const tableCard of newState.tableCards) {
    newState.discardPile.push(tableCard.attackCard);
    if (tableCard.defenseCard) {
      newState.discardPile.push(tableCard.defenseCard);
    }
  }

  newState.tableCards = [];
  newState.canThrowIn = false;

  drawCardsToPlayers(newState);

  const defender = newState.players.find((p) => p.id === newState.currentDefenderId)!;
  const nextDefenderIndex = (defender.position + 1) % newState.players.length;
  newState.currentAttackerId = defender.id;
  newState.currentDefenderId = newState.players[nextDefenderIndex].id;

  newState.phase = "attacking";

  const winner = checkWinner(newState);
  if (winner) {
    newState.phase = "finished";
  }

  return newState;
}

function drawCardsToPlayers(gameState: GameState): void {
  const attackerIndex = gameState.players.findIndex((p) => p.id === gameState.currentAttackerId);
  const defenderIndex = gameState.players.findIndex((p) => p.id === gameState.currentDefenderId);

  const drawOrder = [];
  for (let i = 0; i < gameState.players.length; i++) {
    const idx = (attackerIndex + i) % gameState.players.length;
    if (idx !== defenderIndex) {
      drawOrder.push(idx);
    }
  }
  drawOrder.push(defenderIndex);

  for (const playerIdx of drawOrder) {
    const player = gameState.players[playerIdx];
    while (player.cards.length < 6 && gameState.deck.length > 0) {
      const card = gameState.deck.shift()!;
      player.cards.push(card);
    }
  }
}

function checkWinner(gameState: GameState): Player | null {
  if (gameState.deck.length > 0) {
    return null;
  }

  const playersWithCards = gameState.players.filter((p) => p.cards.length > 0);
  if (playersWithCards.length === 1) {
    return playersWithCards[0];
  }

  if (playersWithCards.length === 0) {
    return null;
  }

  return null;
}
