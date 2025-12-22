import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PlayerHand } from "@/components/PlayerHand";
import { PlayerIndicator } from "@/components/PlayerIndicator";
import { PlayerAvatarsDisplay } from "@/components/PlayerAvatarsDisplay";
import { GameTable } from "@/components/GameTable";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { WinAnimation } from "@/components/WinAnimation";
import { ChevronLeft } from "lucide-react";
import { GameState, Card as CardType, Game } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { canBeatCard } from "@/lib/cardUtils";
import { useGameEvents } from "@/hooks/useWebSocket";

export default function GamePage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const gameId = params.id;
  const { toast } = useToast();

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedTableCardIndex, setSelectedTableCardIndex] = useState<number | null>(null);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [isWin, setIsWin] = useState(true);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const usernameRef = useRef(`Player${Math.floor(Math.random() * 1000)}`);
  const [username] = useState(() => usernameRef.current);
  
  // Generate a stable userId for this session
  const userIdRef = useRef(`user-${Math.random().toString(36).substr(2, 9)}`);
  const [userId] = useState(() => userIdRef.current);
  
  // Only connect WebSocket if we have a valid gameId
  const { gameState: wsGameState, isConnected } = useGameEvents(
    gameId || "", 
    userId, 
    username
  );

  const { data: gameData, isLoading } = useQuery<GameState | Game>({
    queryKey: ["/api/games", gameId],
    enabled: !!gameId && !wsGameState, // Don't fetch if we have WebSocket state
    staleTime: Infinity,
    gcTime: Infinity, // Keep data in cache
  });

  // Memoize gameState to prevent unnecessary re-renders
  const gameState = useMemo(() => {
    return wsGameState || ((gameData && "players" in gameData && Array.isArray(gameData.players)) ? gameData as GameState : null);
  }, [wsGameState, gameData]);
  
  const game = useMemo(() => {
    return (gameData && !("players" in gameData)) ? gameData as Game : null;
  }, [gameData]);

  // Initialize currentPlayerId and maxPlayers when game data becomes available
  useEffect(() => {
    if (game && game.maxPlayers) {
      setMaxPlayers(game.maxPlayers);
    }
  }, [game]);

  useEffect(() => {
    if (gameState && gameState.players.length > 0 && !currentPlayerId) {
      // Try to find a player that matches our userId, otherwise use first player
      // First try to match by userId (if players have userId field)
      // Otherwise match by username or use first player
      const matchingPlayer = gameState.players.find(p => 
        (p as any).userId === userId || p.username === username
      ) || gameState.players[0];
      setCurrentPlayerId(matchingPlayer?.id || gameState.players[0].id || "");
    }
  }, [gameState, currentPlayerId, username, userId]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/games/${gameId}/join`, {});
    },
    onSuccess: () => {
      // Don't invalidate - WebSocket will handle updates
      toast({
        title: "Успешно",
        description: "Вы присоединились к игре",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось присоединиться к игре",
        variant: "destructive",
      });
    },
  });

  const attackMutation = useMutation({
    mutationFn: async (card: CardType) => {
      return await apiRequest("POST", `/api/games/${gameId}/attack`, {
        playerId: currentPlayerId,
        card,
      });
    },
    onSuccess: () => {
      // Don't invalidate - WebSocket will handle updates
      setSelectedCard(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Невозможно сыграть эту карту",
        variant: "destructive",
      });
    },
  });

  const defendMutation = useMutation({
    mutationFn: async ({ card, tableCardIndex }: { card: CardType; tableCardIndex: number }) => {
      return await apiRequest("POST", `/api/games/${gameId}/defend`, {
        playerId: currentPlayerId,
        card,
        tableCardIndex,
      });
    },
    onSuccess: () => {
      // Don't invalidate - WebSocket will handle updates
      setSelectedCard(null);
      setSelectedTableCardIndex(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Невозможно побить эту карту",
        variant: "destructive",
      });
    },
  });

  const takeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/games/${gameId}/take`, {
        playerId: currentPlayerId,
      });
    },
    onSuccess: () => {
      // Don't invalidate - WebSocket will handle updates
      toast({
        title: "Карты взяты",
        description: "Вы взяли все карты со стола",
      });
    },
  });

  const beatMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/games/${gameId}/beat`, {
        playerId: currentPlayerId,
      });
    },
    onSuccess: () => {
      // Don't invalidate - WebSocket will handle updates
      toast({
        title: "Бито!",
        description: "Карты отбиты",
      });
    },
  });

  const handleCardSelect = (card: CardType) => {
    if (!gameState) return;

    const isMyTurn =
      gameState.currentAttackerId === gameState.players[0]?.id ||
      gameState.currentDefenderId === gameState.players[0]?.id;

    if (!isMyTurn) return;

    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
      return;
    }

    setSelectedCard(card);

    if (gameState.currentDefenderId === gameState.players[0]?.id && selectedTableCardIndex !== null) {
      const tableCard = gameState.tableCards[selectedTableCardIndex];
      if (tableCard && !tableCard.defenseCard) {
        if (canBeatCard(tableCard.attackCard, card, gameState.trumpSuit)) {
          defendMutation.mutate({ card, tableCardIndex: selectedTableCardIndex });
        }
      }
    } else if (gameState.currentAttackerId === gameState.players[0]?.id || gameState.canThrowIn) {
      attackMutation.mutate(card);
    }
  };

  const handleBeat = () => {
    if (!gameState) return;
    beatMutation.mutate();
  };

  const handleTake = () => {
    if (!gameState) return;
    takeMutation.mutate();
  };

  const handleReady = () => {
    if (game && game.status === "waiting") {
      joinMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-green-felt flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-green-felt flex flex-col items-center justify-center gap-4">
        <div className="text-white text-xl">Игра не найдена</div>
        <Button onClick={() => setLocation("/")} data-testid="button-back-to-lobby">
          Вернуться в лобби
        </Button>
      </div>
    );
  }

  if (game && game.status === "waiting") {
    return (
      <div className="min-h-screen bg-green-felt flex flex-col items-center justify-center gap-6">
        <div className="text-center text-white space-y-4">
          <h2 className="text-3xl font-bold">Ожидание игроков...</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="text-lg">
              <span className="font-bold text-xl">{game.playerCount}</span>
              <span className="opacity-80"> / {game.maxPlayers}</span>
            </div>
          </div>
          <p className="text-lg opacity-80">Ставка: {game.stake}</p>
        </div>
        <Button
          onClick={handleReady}
          size="lg"
          className="px-12 text-xl"
          disabled={joinMutation.isPending}
          data-testid="button-join-game"
        >
          {joinMutation.isPending ? "Присоединение..." : "Присоединиться"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          data-testid="button-back-to-lobby-waiting"
        >
          Вернуться в лобби
        </Button>
      </div>
    );
  }

  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <div className="min-h-screen bg-green-felt flex items-center justify-center">
        <div className="text-white text-xl">Инициализация игры...</div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId) || gameState.players[0];
  const opponents = gameState.players.filter(p => p.id !== currentPlayerId);
  const isMyAttackTurn = gameState.currentAttackerId === currentPlayerId;
  const isMyDefenseTurn = gameState.currentDefenderId === currentPlayerId;

  return (
    <div className="min-h-screen bg-green-felt relative overflow-hidden">
      {showWinAnimation && (
        <WinAnimation
          amount={winAmount}
          isWin={isWin}
          onComplete={() => setShowWinAnimation(false)}
        />
      )}

      <div className="absolute top-0 left-0 right-0 z-20 bg-durak-green/90 backdrop-blur-sm border-b border-durak-green-felt shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="text-white text-sm" data-testid="player-name">
              {currentPlayer?.username}
            </div>
            <CurrencyDisplay amount={currentPlayer?.coins || 500} />
          </div>
        </div>
      </div>


      <div className="absolute inset-0 flex items-center justify-center pt-32 pb-48">
        {gameState && (
          <PlayerAvatarsDisplay
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            maxPlayers={maxPlayers}
          />
        )}
        <GameTable
          trumpCard={gameState.trumpCard}
          deckCount={gameState.deck.length}
          tableCards={gameState.tableCards}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-durak-green via-durak-green to-transparent pb-4 pt-8">
        <div className="container mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleBeat}
              disabled={!isMyAttackTurn || gameState.tableCards.some(tc => !tc.defenseCard)}
              data-testid="button-beat"
              className="px-8 text-lg font-bold"
            >
              Бито
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={handleTake}
              disabled={!isMyDefenseTurn || gameState.tableCards.length === 0}
              data-testid="button-take"
              className="px-8 text-lg font-bold"
            >
              Беру
            </Button>

            <Button
              size="lg"
              onClick={handleReady}
              disabled={true}
              data-testid="button-ready"
              className="px-8 text-lg font-bold"
            >
              Готов
            </Button>
          </div>

          {currentPlayer && (
            <PlayerHand
              cards={currentPlayer.cards}
              isCurrentPlayer
              selectedCardId={selectedCard?.id}
              onCardClick={handleCardSelect}
              playableCardIds={currentPlayer.cards.map((c) => c.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
