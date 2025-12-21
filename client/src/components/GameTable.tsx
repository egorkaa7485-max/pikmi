import { Card as CardType, TableCard } from "@shared/schema";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

interface GameTableProps {
  trumpCard?: CardType;
  deckCount: number;
  tableCards: TableCard[];
  className?: string;
}

export function GameTable({ trumpCard, deckCount, tableCards, className }: GameTableProps) {
  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div className="relative" data-testid="deck-display">
          {deckCount > 0 && trumpCard && (
            <>
              <PlayingCard card={trumpCard} rotated className="absolute -rotate-90" />

              <div className="relative ml-12">
                <PlayingCard
                  card={{ suit: "hearts", rank: "A", id: "back" } as CardType}
                  faceDown
                />
                {deckCount > 1 && (
                  <div className="absolute top-1 left-1 bg-black/20 rounded-md w-[70px] h-[100px]" />
                )}
              </div>

              <div className="absolute -bottom-6 left-0 right-0 text-center">
                <span className="text-sm font-bold text-white bg-black/30 px-2 py-1 rounded">
                  {deckCount}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-32">
        {tableCards.map((tableCard, index) => (
          <div
            key={index}
            className="relative"
            data-testid={`table-card-pair-${index}`}
          >
            <PlayingCard card={tableCard.attackCard} />

            {tableCard.defenseCard && (
              <div className="absolute top-4 left-4">
                <PlayingCard card={tableCard.defenseCard} />
              </div>
            )}
          </div>
        ))}
      </div>

      {tableCards.length === 0 && (
        <div className="text-white/50 text-lg font-medium">
          Ждем первого хода...
        </div>
      )}
    </div>
  );
}
