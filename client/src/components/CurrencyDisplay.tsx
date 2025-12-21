import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  showIcon?: boolean;
}

export function CurrencyDisplay({ amount, className, showIcon = true }: CurrencyDisplayProps) {
  return (
    <div
      data-testid="currency-display"
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
        "bg-black/20 text-white font-medium",
        className
      )}
    >
      {showIcon && <Coins className="w-4 h-4 text-durak-coin" />}
      <span className="text-sm font-bold">{amount.toLocaleString()}</span>
    </div>
  );
}
