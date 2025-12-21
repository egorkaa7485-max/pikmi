import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameType, ThrowMode, Variant, FairnessMode, gameTypes, throwModes, variants, fairnessModes } from "@shared/schema";
import { GameModeIcon } from "./GameModeIcon";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (settings: GameSettings) => void;
}

export interface GameSettings {
  stake: number;
  maxPlayers: number;
  deckSize: number;
  speed: "slow" | "normal";
  gameType: GameType;
  throwMode: ThrowMode;
  variant: Variant;
  fairness: FairnessMode;
  isPrivate: boolean;
}

const STAKE_VALUES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000];

const formatStake = (value: number): string => {
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
};

export function CreateGameModal({ isOpen, onClose, onCreate }: CreateGameModalProps) {
  const [stakeIndex, setStakeIndex] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [deckSize, setDeckSize] = useState(36);
  const [speed, setSpeed] = useState<"slow" | "normal">("normal");
  const [gameType, setGameType] = useState<GameType>("подкидной");
  const [throwMode, setThrowMode] = useState<ThrowMode>("соседи");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = () => {
    onCreate({
      stake: STAKE_VALUES[stakeIndex],
      maxPlayers,
      deckSize,
      speed,
      gameType,
      throwMode,
      variant: "классика",
      fairness: "ничья",
      isPrivate,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        data-testid="create-game-overlay"
      />

      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Создать игру</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-create"
          >
            <X className="w-5 h-5 text-gray-900 dark:text-white" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Ставка</h3>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">
                  {formatStake(STAKE_VALUES[stakeIndex])}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>100</span>
                <span>10M</span>
              </div>
              <Slider
                value={[stakeIndex]}
                onValueChange={(value) => setStakeIndex(value[0])}
                min={0}
                max={STAKE_VALUES.length - 1}
                step={1}
                className="w-full"
                data-testid="slider-create-stake"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Игроки</h3>
            <div className="flex flex-wrap gap-2">
              {[2, 3, 4, 5, 6].map((count) => (
                <Badge
                  key={count}
                  variant={maxPlayers === count ? "default" : "outline"}
                  className="cursor-pointer px-6 py-3 text-lg hover-elevate active-elevate-2"
                  onClick={() => setMaxPlayers(count)}
                  data-testid={`badge-create-player-${count}`}
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
                  variant={deckSize === size ? "default" : "outline"}
                  className="cursor-pointer px-6 py-3 text-lg hover-elevate active-elevate-2"
                  onClick={() => setDeckSize(size)}
                  data-testid={`badge-create-deck-${size}`}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Скорость</h3>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={speed === "slow" ? "default" : "outline"}
                className="cursor-pointer px-6 py-3 text-lg hover-elevate active-elevate-2"
                onClick={() => setSpeed("slow")}
                data-testid="badge-speed-slow"
              >
                ▶
              </Badge>
              <Badge
                variant={speed === "normal" ? "default" : "outline"}
                className="cursor-pointer px-6 py-3 text-lg hover-elevate active-elevate-2"
                onClick={() => setSpeed("normal")}
                data-testid="badge-speed-normal"
              >
                ▶▶
              </Badge>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Режим игры</h3>
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-300">Тип игры</h4>
              <div className="grid grid-cols-2 gap-2">
                {(["подкидной", "переводной"] as GameType[]).map((type) => (
                  <div
                    key={type}
                    onClick={() => setGameType(type)}
                    data-testid={`create-mode-${type}`}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      "hover-elevate active-elevate-2",
                      gameType === type
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <GameModeIcon mode={type} className="w-5 h-5 text-gray-900 dark:text-white" />
                    <span className="text-xs font-medium text-center text-gray-900 dark:text-white">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-300">Подкидывают</h4>
              <div className="grid grid-cols-2 gap-2">
                {throwModes.map((mode) => (
                  <div
                    key={mode}
                    onClick={() => setThrowMode(mode)}
                    data-testid={`create-mode-${mode}`}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      "hover-elevate active-elevate-2",
                      throwMode === mode
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <GameModeIcon mode={mode} className="w-5 h-5 text-gray-900 dark:text-white" />
                    <span className="text-xs font-medium text-center text-gray-900 dark:text-white">{mode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="private-game"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
              data-testid="checkbox-private"
            />
            <label
              htmlFor="private-game"
              className="text-base font-medium cursor-pointer select-none text-gray-900 dark:text-white"
            >
              Приватная игра
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="button-cancel-create"
          >
            Отмена
          </Button>
          <Button onClick={handleCreate} className="flex-1 text-lg" data-testid="button-create-game">
            Создать ▶
          </Button>
        </div>
      </div>
    </div>
  );
}
