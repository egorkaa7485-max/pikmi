import { User, Heart, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: "profile" | "open" | "private" | "create";
  onTabChange: (tab: "profile" | "open" | "private" | "create") => void;
}

const tabs = [
  { id: "profile" as const, label: "Профиль", icon: User },
  { id: "open" as const, label: "Открытые", icon: Heart },
  { id: "private" as const, label: "Приватные", icon: Lock },
  { id: "create" as const, label: "Создать игру", icon: Plus },
];

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 transition-colors",
                "hover-elevate active-elevate-2",
                isActive
                  ? "text-durak-red bg-red-50"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
