import { GameState } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PlayerAvatarsDisplayProps {
  gameState: GameState;
  currentPlayerId: string;
  maxPlayers: number;
  creatorId: string;
}

export function PlayerAvatarsDisplay({
  gameState,
  currentPlayerId,
  maxPlayers,
  creatorId,
}: PlayerAvatarsDisplayProps) {
  const players = gameState.players;

  // Create array of all player slots (connected and empty slots)
  const playerSlots = Array.from({ length: maxPlayers }, (_, index) => {
    return players[index] || null;
  });

  // Find host/creator player
  const hostPlayerIndex = playerSlots.findIndex(
    (player) => player?.id === creatorId
  );

  // Separate host player and other players
  const hostPlayer = playerSlots[hostPlayerIndex];
  const otherPlayers = playerSlots.filter((_, index) => index !== hostPlayerIndex);

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

  // Calculate perpendicular positions for other players (left and right, horizontal)
  const getOtherPlayerPosition = (index: number) => {
    const totalOthers = otherPlayers.length;
    if (totalOthers === 0) return { x: 0, y: 0 };
    
    // Distribute other players horizontally (perpendicular to host position)
    // Host is at bottom center, so perpendicular is horizontal (left-right)
    
    // Responsive radius - distance from center horizontally
    const baseRadius = 250;
    const radius = window.innerWidth < 640 ? baseRadius * 0.6 : window.innerWidth < 1024 ? baseRadius * 0.8 : baseRadius;
    
    // Distribute players evenly across left and right
    // For odd number of players, one stays center; rest spread left and right
    if (totalOthers === 1) {
      // Single player - center horizontally
      return { x: 0, y: -180 };
    }
    
    const isEven = totalOthers % 2 === 0;
    const halfLength = Math.floor(totalOthers / 2);
    
    let x = 0;
    let y = -180; // Vertical position (above center)
    
    if (isEven) {
      // Even number: split left and right evenly
      if (index < halfLength) {
        // Left side
        x = -radius * ((halfLength - index) / halfLength);
      } else {
        // Right side
        x = radius * ((index - halfLength + 1) / halfLength);
      }
    } else {
      // Odd number: center one in middle, rest on sides
      if (index === Math.floor(totalOthers / 2)) {
        // Center player - raise higher to create arc
        x = 0;
        y = -260; // Raise center avatar higher
      } else if (index < Math.floor(totalOthers / 2)) {
        // Left side
        x = -radius * ((Math.floor(totalOthers / 2) - index) / Math.ceil(totalOthers / 2));
      } else {
        // Right side
        x = radius * ((index - Math.floor(totalOthers / 2)) / Math.ceil(totalOthers / 2));
      }
    }
    
    return { x, y };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Other players in semi-circle at top (right to left) */}
      {otherPlayers.map((player, index) => {
        const position = getOtherPlayerPosition(index);
        return (
          <div
            key={`other-${index}`}
            className="absolute"
            style={{
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            }}
          >
            <PlayerAvatar player={player} />
          </div>
        );
      })}

      {/* Host player below buttons - positioned at the very bottom with z-index */}
      <div className="absolute bottom-1 z-20">
        {hostPlayer ? (
          <PlayerAvatar player={hostPlayer} isCurrentPlayer={false} />
        ) : (
          <div className="text-white text-sm">Loading...</div>
        )}
      </div>
    </div>
  );
}
