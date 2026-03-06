import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

interface NutqLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export default function NutqLogo({ size = "md", showTagline = false }: NutqLogoProps) {
  const { colors, isDark } = useTheme();

  const dims = { sm: 32, md: 44, lg: 64 }[size];
  const fontSize = { sm: 16, md: 22, lg: 32 }[size];
  const tagSize = { sm: 9, md: 11, lg: 14 }[size];

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { width: dims, height: dims, borderRadius: dims * 0.28, backgroundColor: isDark ? "#1a1a3e" : "#EEF2FF", borderColor: isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.3)" }]}>
        <Text style={[styles.arabicLetter, { fontSize: fontSize * 0.9, color: isDark ? "#A5B4FC" : "#4F46E5" }]}>ن</Text>
      </View>
      <View>
        <Text style={[styles.logoText, { fontSize: fontSize * 0.75, color: colors.text }]}>نطق</Text>
        {showTagline && (
          <Text style={[styles.tagline, { fontSize: tagSize, color: colors.textSecondary }]}>
            تعلّم • تحدّث • تميّز
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  arabicLetter: {
    fontFamily: "Cairo_700Bold",
    lineHeight: undefined,
  },
  logoText: {
    fontFamily: "Cairo_700Bold",
    lineHeight: undefined,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: "Cairo_400Regular",
    marginTop: -2,
  },
});
