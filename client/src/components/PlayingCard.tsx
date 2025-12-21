import { Card as CardType, Suit, Rank } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  card: CardType;
  faceDown?: boolean;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  isTrump?: boolean;
  rotated?: boolean;
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
  "J": "В",
  "Q": "Д",
  "K": "К",
  "A": "Т",
};

export function PlayingCard({
  card,
  faceDown = false,
  className,
  onClick,
  isSelected = false,
  isPlayable = false,
  isTrump = false,
  rotated = false,
}: PlayingCardProps) {
  const suitColor = suitColors[card.suit];
  const suitSymbol = suitSymbols[card.suit];
  const rank = rankDisplay[card.rank];

  return (
    <div
      onClick={onClick}
      data-testid={`card-${card.id}`}
      className={cn(
        "playing-card relative",
        "select-none",
        isSelected && "-translate-y-4 shadow-2xl ring-2 ring-[hsl(var(--rst-red))]",
        isPlayable && "cursor-pointer",
        !faceDown && isPlayable && "hover:-translate-y-3",
        isTrump && "ring-2 ring-[hsl(var(--rst-money-green))] ring-offset-2",
        rotated && "rotate-90",
        className
      )}
      style={{
        width: "clamp(50px, 12vw, 80px)",
        aspectRatio: "5/7",
      }}
    >
      {faceDown ? (
        <div className="playing-card-back w-full h-full flex items-center justify-center">
          <div className="text-white text-opacity-20 text-2xl font-bold">RST</div>
        </div>
      ) : (
        <>
          {/* Top-left corner */}
          <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
            <span className="text-base font-bold" style={{ color: suitColor }}>
              {rank}
            </span>
            <span className="text-lg" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>

          {/* Center suit symbol */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>

          {/* Bottom-right corner (upside down) */}
          <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none transform rotate-180">
            <span className="text-base font-bold" style={{ color: suitColor }}>
              {rank}
            </span>
            <span className="text-lg" style={{ color: suitColor }}>
              {suitSymbol}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
