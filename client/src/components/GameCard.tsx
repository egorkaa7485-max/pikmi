import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Game } from "@shared/schema";
import { Users, Layers } from "lucide-react";
import { GameModeIcon } from "./GameModeIcon";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

export function GameCard({ game, onClick }: GameCardProps) {
  const playerCountText = `${game.playerCount}/${game.maxPlayers}`;

  return (
    <Card
      data-testid={`game-card-${game.id}`}
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer hover-elevate active-elevate-2",
        "transition-all duration-200",
        "bg-white/95 backdrop-blur-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-card-foreground">
              {game.stake >= 1000
                ? `${(game.stake / 1000).toFixed(game.stake >= 1000000 ? 1 : 0)}${game.stake >= 1000000 ? "M" : "K"}`
                : game.stake}
            </span>
            <Badge variant="outline" className="text-xs">
              {playerCountText}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>{game.deckSize}</span>
            </div>
            <span>•</span>
            <span className="capitalize">{game.speed}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="grid grid-cols-2 gap-1">
            <GameModeIcon mode={game.gameType} className="w-4 h-4 text-primary" title={game.gameType} />
            <GameModeIcon mode={game.throwMode} className="w-4 h-4 text-primary" title={game.throwMode} />
            <GameModeIcon mode={game.variant} className="w-4 h-4 text-primary" title={game.variant} />
            <GameModeIcon mode={game.fairness} className="w-4 h-4 text-primary" title={game.fairness} />
          </div>
          {game.status === "waiting" && (
            <Badge variant="secondary" className="text-xs">
              Ожидание
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
