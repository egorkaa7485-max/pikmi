import { Card as CardType } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  cards: CardType[];
  isCurrentPlayer?: boolean;
  onCardClick?: (card: CardType) => void;
  selectedCardId?: string;
  playableCardIds?: string[];
  className?: string;
}

export function PlayerHand({
  cards,
  isCurrentPlayer = false,
  onCardClick,
  selectedCardId,
  playableCardIds = [],
  className,
}: PlayerHandProps) {
  return (
    <div className={cn("flex items-end justify-center", className)}>
      <div className="relative flex items-end" style={{ height: "120px" }}>
        {cards.map((card, index) => {
          const isPlayable = playableCardIds.includes(card.id);
          const isSelected = selectedCardId === card.id;

          return (
            <div
              key={card.id}
              className="relative"
              style={{
                marginLeft: index === 0 ? 0 : "-45px",
                transform: `translateY(${index * -2}px) rotate(${(index - cards.length / 2) * 3}deg)`,
                zIndex: isSelected ? 50 : index,
              }}
            >
              <PlayingCard
                card={card}
                isSelected={isSelected}
                isPlayable={isCurrentPlayer && isPlayable}
                onClick={isCurrentPlayer && isPlayable ? () => onCardClick?.(card) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
