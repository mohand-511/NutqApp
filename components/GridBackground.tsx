import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, Pattern, Rect, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";

const { width, height } = Dimensions.get("window");

interface GridBackgroundProps {
  children?: React.ReactNode;
  style?: object;
}

export function GridBackground({ children, style }: GridBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      <Svg
        style={StyleSheet.absoluteFillObject}
        width={width}
        height={height}
      >
        <Defs>
          <Pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <Rect width="28" height="28" fill="none" />
            <Line x1="28" y1="0" x2="28" y2="28" stroke="#1A1A2E" strokeWidth="0.5" />
            <Line x1="0" y1="28" x2="28" y2="28" stroke="#1A1A2E" strokeWidth="0.5" />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill={Colors.background} />
        <Rect width={width} height={height} fill="url(#grid)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
