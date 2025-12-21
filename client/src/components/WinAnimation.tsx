import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WinAnimationProps {
  amount: number;
  isWin: boolean;
  onComplete?: () => void;
}

export function WinAnimation({ amount, isWin, onComplete }: WinAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        className={cn(
          "animate-in zoom-in-50 duration-500",
          "bg-gradient-to-br rounded-xl p-8 shadow-2xl",
          isWin
            ? "from-green-500 to-green-600 text-white"
            : "from-red-500 to-red-600 text-white"
        )}
        data-testid="win-animation"
      >
        <div className="text-6xl font-bold mb-2">
          {isWin ? "+" : ""}{amount}
        </div>
        <div className="text-xl font-medium">
          {isWin ? "Победа!" : "Поражение"}
        </div>
      </div>
    </div>
  );
}
