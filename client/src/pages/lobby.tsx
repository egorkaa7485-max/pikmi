import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { FilterPanel, FilterState } from "@/components/FilterPanel";
import { CreateGameModal, GameSettings } from "@/components/CreateGameModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { useToast } from "@/hooks/use-toast";
import { Filter, Flag } from "lucide-react";
import { Game } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "open" | "private" | "create">("open");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [userBalance] = useState(500);
  const [filters, setFilters] = useState<FilterState>({
    stakeRange: [100, 10000000],
    playerCounts: [2, 3, 4, 5, 6],
    deckSizes: [24, 36, 52],
  });

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const createGameMutation = useMutation({
    mutationFn: async (settings: GameSettings) => {
      const response = await apiRequest("POST", "/api/games", settings);
      return await response.json();
    },
    onSuccess: (newGame) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setLocation(`/game/${newGame.id}`);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось создать игру",
      });
    },
  });

  const handleCreateGame = (settings: GameSettings) => {
    if (settings.stake > userBalance) {
      toast({
        variant: "destructive",
        title: "Недостаточно монет",
        description: `У вас ${userBalance} монет, а ставка ${settings.stake}`,
      });
      return;
    }
    createGameMutation.mutate(settings);
  };

  const handleJoinGame = (game: Game) => {
    if (game.stake > userBalance) {
      toast({
        variant: "destructive",
        title: "Недостаточно монет",
        description: `У вас ${userBalance} монет, а ставка ${game.stake}`,
      });
      return;
    }
    setLocation(`/game/${game.id}`);
  };

  const handleTabChange = (tab: "profile" | "open" | "private" | "create") => {
    if (tab === "create") {
      setIsCreateOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-blue-texture pb-20">
      <div className="sticky top-0 z-30 bg-durak-blue/95 backdrop-blur-sm border-b border-durak-blue-dark shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="w-6 h-6 text-white" />
            <h1 className="text-xl font-bold text-white">Дурак Онлайн</h1>
          </div>

          <div className="flex items-center gap-3">
            <CurrencyDisplay amount={userBalance} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFilterOpen(true)}
              data-testid="button-open-filters"
              className="text-white hover:bg-white/20"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {activeTab === "open" && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white mb-2">Открытые игры</h2>
              <p className="text-sm text-white/80">
                Выберите игру или создайте свою
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-white/20 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : games && games.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleJoinGame(game)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/80 mb-4">Нет доступных игр</p>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  data-testid="button-create-first-game"
                >
                  Создать игру
                </Button>
              </div>
            )}
          </>
        )}

        {activeTab === "profile" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Профиль</h2>
            <p className="text-white/80">Профиль в разработке</p>
          </div>
        )}

        {activeTab === "private" && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Приватные игры</h2>
            <p className="text-white/80">Приватные игры в разработке</p>
          </div>
        )}
      </div>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={setFilters}
        initialFilters={filters}
      />

      <CreateGameModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateGame}
      />

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
