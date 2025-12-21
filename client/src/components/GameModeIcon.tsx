import { Users, ArrowRight, Globe, UserX, Shield, Handshake, Users as UsersIcon } from "lucide-react";
import { GameType, ThrowMode, Variant, FairnessMode } from "@shared/schema";

type AllGameModes = GameType | ThrowMode | Variant | FairnessMode;

interface GameModeIconProps {
  mode: AllGameModes;
  className?: string;
}

const modeIcons: Record<AllGameModes, React.ElementType> = {
  "подкидной": ArrowRight,
  "соседи": Users,
  "все": Globe,
  "переводной": UserX,
  "с шулерами": UsersIcon,
  "классика": Shield,
  "честная": Handshake,
  "ничья": UsersIcon,
};

export function GameModeIcon({ mode, className }: GameModeIconProps) {
  const Icon = modeIcons[mode] || Shield;
  return <Icon className={className} />;
}
