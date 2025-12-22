import { GameState } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PlayerAvatarsDisplayProps {
  gameState: GameState;
  currentPlayerId: string;
  maxPlayers: number;
}

export function PlayerAvatarsDisplay({
  gameState,
  currentPlayerId,
  maxPlayers,
}: PlayerAvatarsDisplayProps) {
  const players = gameState.players;

  // Create array of all player slots (connected and empty slots)
  const playerSlots = Array.from({ length: maxPlayers }, (_, index) => {
    return players[index] || null;
  });

  // Find current player index
  const currentPlayerIndex = playerSlots.findIndex(
    (player) => player?.id === currentPlayerId
  );

  // Separate current player and opponents
  const currentPlayer = playerSlots[currentPlayerIndex];
  const opponents = playerSlots.filter((_, index) => index !== currentPlayerIndex);

  // Responsive sizing based on screen
  const getResponsiveSize = () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) return { avatarSize: "w-10 h-10", gap: "gap-1", textSize: "text-xs" };
      if (width < 1024) return { avatarSize: "w-12 h-12", gap: "gap-2", textSize: "text-xs" };
      return { avatarSize: "w-14 h-14", gap: "gap-3", textSize: "text-sm" };
    }
    return { avatarSize: "w-12 h-12", gap: "gap-2", textSize: "text-xs" };
  };

  const sizes = getResponsiveSize();

  const PlayerAvatar = ({ player, isCurrentPlayer }: { player: typeof playerSlots[0]; isCurrentPlayer?: boolean }) => (
    <div className={`flex flex-col items-center ${sizes.gap}`}>
      {/* Player Circle */}
      <div className="relative">
        {player ? (
          <div className="relative">
            <Avatar className={`${sizes.avatarSize} border-2 border-white/80 bg-gradient-to-br from-purple-500 to-pink-500`}>
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                {player.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Card count badge */}
            {player.cards.length > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                {player.cards.length}
              </div>
            )}
          </div>
        ) : (
          /* Empty player slot with + sign */
          <div className={`${sizes.avatarSize} rounded-full border-2 border-dashed border-white/50 bg-white/10 flex items-center justify-center text-white/60 text-xl font-bold hover:bg-white/20 transition-colors`}>
            +
          </div>
        )}
      </div>

      {/* Player name label */}
      {player && (
        <div className={`text-white ${sizes.textSize} font-medium text-center whitespace-nowrap max-w-[60px] truncate`}>
          {player.username}
        </div>
      )}
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none py-4 md:py-6 lg:py-8">
      {/* Opponents at top center */}
      <div className="flex flex-wrap justify-center items-start gap-2 md:gap-3 lg:gap-4 px-4 max-w-4xl w-full">
        {opponents.map((player, index) => (
          <PlayerAvatar key={`opponent-${index}`} player={player} />
        ))}
      </div>

      {/* Current player at bottom center */}
      <div className="mb-2 md:mb-4">
        {currentPlayer ? (
          <PlayerAvatar player={currentPlayer} isCurrentPlayer={true} />
        ) : (
          <div className="text-white text-sm">Loading...</div>
        )}
      </div>
    </div>
  );
}
