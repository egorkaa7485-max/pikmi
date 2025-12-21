import { Card, Suit, Rank } from "@shared/schema";

const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const ranks36: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const ranks52: Rank[] = ["6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const ranks24: Rank[] = ["9", "10", "J", "Q", "K", "A"];

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

export function canBeatCard(
  attackCard: Card,
  defenseCard: Card,
  trumpSuit: Suit
): boolean {
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

export function getLowestTrump(cards: Card[], trumpSuit: Suit): Card | null {
  const trumpCards = cards.filter((card) => card.suit === trumpSuit);
  if (trumpCards.length === 0) return null;

  return trumpCards.reduce((lowest, card) =>
    rankValues[card.rank] < rankValues[lowest.rank] ? card : lowest
  );
}
