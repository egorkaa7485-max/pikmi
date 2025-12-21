import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlayerIndicatorProps {
  username: string;
  cardCount: number;
  isActive?: boolean;
  isCurrentUser?: boolean;
  coins?: number;
  position?: "top" | "left" | "right";
  className?: string;
}

export function PlayerIndicator({
  username,
  cardCount,
  isActive = false,
  isCurrentUser = false,
  coins,
  position = "top",
  className,
}: PlayerIndicatorProps) {
  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-white/90 backdrop-blur-sm",
        isActive && "ring-2 ring-durak-red shadow-lg",
        className
      )}
      data-testid={`player-${username}`}
    >
      <Avatar className="w-10 h-10 border-2 border-white">
        <AvatarImage src="" />
        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-card-foreground truncate">
          {username}
          {isCurrentUser && " (Вы)"}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{cardCount} карт</span>
          {coins !== undefined && (
            <>
              <span>•</span>
              <span className="text-durak-coin font-bold">{coins}</span>
            </>
          )}
        </div>
      </div>

      {isActive && (
        <Badge variant="destructive" className="text-xs">
          Ход
        </Badge>
      )}
    </div>
  );
}
