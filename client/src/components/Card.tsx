import { Card as CardType, Suit, Rank } from "@shared/schema";

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const suitSymbols: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const suitColors: Record<Suit, string> = {
  hearts: "#E03C3C",
  diamonds: "#E03C3C",
  clubs: "#000000",
  spades: "#000000",
};

const rankDisplay: Record<Rank, string> = {
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "В",  // Валет
  Q: "Д",  // Дама
  K: "К",  // Король
  A: "Т",  // Туз
};

export function Card({ card, faceDown = false, className = "", onClick, style }: CardProps) {
  if (faceDown || !card) {
    return (
      <div
        className={`playing-card playing-card-back cursor-pointer ${className}`}
        onClick={onClick}
        style={style}
        data-testid="card-back"
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-opacity-20 text-2xl font-bold">RST</div>
        </div>
      </div>
    );
  }

  const suit = suitSymbols[card.suit];
  const color = suitColors[card.suit];
  const rank = rankDisplay[card.rank];

  return (
    <div
      className={`playing-card relative select-none cursor-pointer ${className}`}
      onClick={onClick}
      style={style}
      data-testid={`card-${card.suit}-${card.rank}`}
    >
      {/* Top-left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className="text-base font-bold" style={{ color }}>
          {rank}
        </span>
        <span className="text-lg" style={{ color }}>
          {suit}
        </span>
      </div>

      {/* Center suit symbol */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl" style={{ color }}>
          {suit}
        </span>
      </div>

      {/* Bottom-right corner (upside down) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none transform rotate-180">
        <span className="text-base font-bold" style={{ color }}>
          {rank}
        </span>
        <span className="text-lg" style={{ color }}>
          {suit}
        </span>
      </div>
    </div>
  );
}
