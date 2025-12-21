import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameType, ThrowMode, Variant, FairnessMode, gameTypes, throwModes, variants, fairnessModes } from "@shared/schema";
import { GameModeIcon } from "./GameModeIcon";

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  stakeRange: [number, number];
  playerCounts: number[];
  deckSizes: number[];
  gameTypes?: GameType[];
  throwModes?: ThrowMode[];
  variants?: Variant[];
  fairnessModes?: FairnessMode[];
}

const STAKE_VALUES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];

const formatStake = (value: number | undefined): string => {
  if (!value && value !== 0) return "0";
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
};

export function FilterPanel({ isOpen, onClose, onApply, initialFilters }: FilterPanelProps) {
  const getStakeIndex = (value: number): number => {
    const index = STAKE_VALUES.indexOf(value);
    return index !== -1 ? index : 0;
  };

  const [stakeRange, setStakeRange] = useState<[number, number]>(() => {
    if (initialFilters?.stakeRange) {
      return [
        getStakeIndex(initialFilters.stakeRange[0]),
        getStakeIndex(initialFilters.stakeRange[1])
      ];
    }
    return [0, STAKE_VALUES.length - 1];
  });
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>(
    initialFilters?.playerCounts || [2, 3, 4, 5, 6]
  );
  const [selectedDecks, setSelectedDecks] = useState<number[]>(
    initialFilters?.deckSizes || [24, 36, 52]
  );

  const togglePlayer = (count: number) => {
    setSelectedPlayers((prev) =>
      prev.includes(count) ? prev.filter((p) => p !== count) : [...prev, count]
    );
  };

  const toggleDeck = (size: number) => {
    setSelectedDecks((prev) =>
      prev.includes(size) ? prev.filter((d) => d !== size) : [...prev, size]
    );
  };

  const handleApply = () => {
    onApply({
      stakeRange: [STAKE_VALUES[stakeRange[0]], STAKE_VALUES[stakeRange[1]]],
      playerCounts: selectedPlayers,
      deckSizes: selectedDecks,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="filter-overlay"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-filters"
            className="sm:hidden"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-white" />
          </Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Настройки фильтров</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-filters-x"
            className="hidden sm:flex"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ставка</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{formatStake(STAKE_VALUES[stakeRange[0]])}</span>
                <span>{formatStake(STAKE_VALUES[stakeRange[1]])}</span>
              </div>
              <Slider
                value={stakeRange}
                onValueChange={(value) => setStakeRange(value as [number, number])}
                min={0}
                max={STAKE_VALUES.length - 1}
                step={1}
                className="w-full"
                data-testid="slider-stake"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Игроки</h3>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((count) => (
                <Badge
                  key={count}
                  variant={selectedPlayers.includes(count) ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2 text-base hover-elevate active-elevate-2"
                  onClick={() => togglePlayer(count)}
                  data-testid={`badge-player-${count}`}
                >
                  {count}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Колода</h3>
            <div className="flex flex-wrap gap-2">
              {[24, 36, 52].map((size) => (
                <Badge
                  key={size}
                  variant={selectedDecks.includes(size) ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2 text-base hover-elevate active-elevate-2"
                  onClick={() => toggleDeck(size)}
                  data-testid={`badge-deck-${size}`}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>

        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-filters"
          >
            Отмена
          </Button>
          <Button onClick={handleApply} className="flex-1" data-testid="button-apply-filters">
            Применить
          </Button>
        </div>
      </div>
    </div>
  );
}
