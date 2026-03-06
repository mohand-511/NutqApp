import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, Pattern, Rect, Line } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

const { width, height } = Dimensions.get("window");

interface GridBackgroundProps {
  children?: React.ReactNode;
  style?: object;
}

export function GridBackground({ children, style }: GridBackgroundProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
        <Defs>
          <Pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <Rect width="28" height="28" fill="none" />
            <Line x1="28" y1="0" x2="28" y2="28" stroke={colors.gridLine} strokeWidth="0.5" />
            <Line x1="0" y1="28" x2="28" y2="28" stroke={colors.gridLine} strokeWidth="0.5" />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill={colors.background} />
        <Rect width={width} height={height} fill="url(#grid)" />
      </Svg>
      {children}
    </View>
  );
}
