const BLUE = "#2563EB";
const PURPLE = "#7C3AED";
const BLUE_LIGHT = "#3B82F6";
const PURPLE_LIGHT = "#8B5CF6";

export const Colors = {
  background: "#050508",
  backgroundSecondary: "#0D0D14",
  backgroundCard: "#111120",
  backgroundCardBorder: "#1E1E32",
  blue: BLUE,
  blueLight: BLUE_LIGHT,
  purple: PURPLE,
  purpleLight: PURPLE_LIGHT,
  gradientStart: BLUE,
  gradientEnd: PURPLE,
  text: "#F0F0FF",
  textSecondary: "#8888AA",
  textMuted: "#44445A",
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  success: "#10B981",
  error: "#EF4444",
  white: "#FFFFFF",
  black: "#000000",
  tabBar: "rgba(5,5,8,0.92)",
  border: "#1A1A2E",
};

export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.blue,
    tabIconDefault: Colors.textMuted,
    tabIconSelected: Colors.blue,
  },
};
