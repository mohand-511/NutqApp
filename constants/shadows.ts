import { Platform } from "react-native";
import { Colors } from "./colors";

export function shadow(color: string = Colors.blue, elevation = 8) {
  if (Platform.OS === "web") return {};
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation,
  };
}

export function glowShadow(color: string = Colors.blue) {
  if (Platform.OS === "web") return {};
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  };
}
