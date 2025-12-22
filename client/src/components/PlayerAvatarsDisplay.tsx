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

  // Host is always at index 0 (first player, bottom center)
  // Other players arranged perpendicular/opposite around the table
  const getPlayerPosition = (slotIndex: number) => {
    // Calculate relative position from host player (always at index 0)
    // Host is always at bottom (index 0 in display)
    const relativeIndex = slotIndex;

    // For a circular arrangement around the table
    // 0 = bottom (current player)
    // Other positions distributed around the circle
    const angle = (relativeIndex / maxPlayers) * 360 - 90; // -90 so bottom is 0 degrees

    // Convert to radians
    const radians = (angle * Math.PI) / 180;

    // Calculate position on a circle with radius 300px
    const radius = 300;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;

    return { x, y };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {playerSlots.map((player, index) => {
        const position = getPlayerPosition(index);
        const isCurrentPlayer = player?.id === currentPlayerId;

        return (
          <div
            key={index}
            className="absolute flex flex-col items-center gap-2"
            style={{
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            }}
          >
            {/* Player Circle */}
            <div className={`relative ${isCurrentPlayer ? "" : ""}`}>
              {player ? (
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-white/80 bg-gradient-to-br from-purple-500 to-pink-500">
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
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 bg-white/10 flex items-center justify-center text-white/60 text-xl font-bold hover:bg-white/20 transition-colors">
                  +
                </div>
              )}
            </div>

            {/* Player name label */}
            {player && (
              <div className="text-white text-xs font-medium text-center whitespace-nowrap max-w-[60px] truncate">
                {player.username}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
