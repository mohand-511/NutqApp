import React, { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse, Defs, RadialGradient, Stop, LinearGradient } from "react-native-svg";
import { Colors } from "@/constants/colors";

interface AvatarProps {
  size?: number;
  speaking?: boolean;
}

export function SaudiAvatar({ size = 120, speaking = false }: AvatarProps) {
  const pulseAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.4);
  const wave1 = useSharedValue(0.3);
  const wave2 = useSharedValue(0.5);
  const wave3 = useSharedValue(0.4);

  useEffect(() => {
    if (speaking) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97, { duration: 400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      wave1.value = withRepeat(
        withSequence(withTiming(0.9, { duration: 200 }), withTiming(0.2, { duration: 200 })),
        -1,
        true
      );
      wave2.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 150 }),
          withTiming(1.0, { duration: 200 }),
          withTiming(0.5, { duration: 150 })
        ),
        -1,
        true
      );
      wave3.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 250 }), withTiming(0.2, { duration: 250 })),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 300 });
      glowAnim.value = withTiming(0.4, { duration: 300 });
      wave1.value = withTiming(0.3, { duration: 300 });
      wave2.value = withTiming(0.5, { duration: 300 });
      wave3.value = withTiming(0.4, { duration: 300 });
    }
  }, [speaking]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  const w1Style = useAnimatedStyle(() => ({ transform: [{ scaleY: wave1.value }] }));
  const w2Style = useAnimatedStyle(() => ({ transform: [{ scaleY: wave2.value }] }));
  const w3Style = useAnimatedStyle(() => ({ transform: [{ scaleY: wave3.value }] }));

  const s = size;

  return (
    <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[StyleSheet.absoluteFillObject, glowStyle]}>
        <View
          style={{
            position: "absolute",
            top: s * 0.05,
            left: s * 0.05,
            right: s * 0.05,
            bottom: s * 0.05,
            borderRadius: s,
            backgroundColor: Colors.blue,
            opacity: 0.25,
          }}
        />
      </Animated.View>

      <Animated.View style={avatarStyle}>
        <Svg width={s} height={s} viewBox="0 0 120 120">
          <Defs>
            <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1E1B4B" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0D0D14" stopOpacity="1" />
            </RadialGradient>
            <LinearGradient id="thobe" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E8E8F0" />
              <Stop offset="100%" stopColor="#C8C8DC" />
            </LinearGradient>
            <LinearGradient id="ghutrah" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E53E3E" />
              <Stop offset="100%" stopColor="#9B2C2C" />
            </LinearGradient>
            <LinearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#D4A574" />
              <Stop offset="100%" stopColor="#B8845A" />
            </LinearGradient>
          </Defs>

          <Circle cx="60" cy="60" r="60" fill="url(#bgGrad)" />
          <Circle cx="60" cy="60" r="58" fill="none" stroke="#2563EB" strokeWidth="0.5" strokeOpacity="0.5" />

          <Ellipse cx="60" cy="115" rx="30" ry="16" fill="url(#thobe)" />
          <Path d="M35 90 Q50 75 60 70 Q70 75 85 90 Q90 100 88 115 H32 Q30 100 35 90Z" fill="url(#thobe)" />
          <Path d="M52 68 L48 115 M68 68 L72 115" stroke="#CCCCDD" strokeWidth="0.5" strokeOpacity="0.5" />

          <Circle cx="60" cy="52" r="16" fill="url(#skinGrad)" />

          <Path
            d="M44 40 Q44 22 60 20 Q76 22 76 40 Q78 36 76 30 Q70 15 60 14 Q50 15 44 30 Q42 36 44 40Z"
            fill="#1A0A00"
          />
          <Path
            d="M44 38 Q46 28 60 26 Q74 28 76 38"
            fill="url(#ghutrah)"
            stroke="#7B2020"
            strokeWidth="0.5"
          />
          <Path
            d="M44 38 L40 55 Q40 62 44 65 Q42 58 44 55 Z"
            fill="url(#ghutrah)"
          />
          <Path
            d="M76 38 L80 55 Q80 62 76 65 Q78 58 76 55 Z"
            fill="url(#ghutrah)"
          />
          <Path
            d="M60 26 L58 70 M60 26 L62 70"
            stroke="#8B2020"
            strokeWidth="0.4"
            strokeOpacity="0.5"
          />
          <Circle cx="60" cy="42" r="3.5" fill="#1A0A00" />

          <Ellipse cx="54" cy="48" rx="3" ry="2" fill="#2A1A0A" />
          <Ellipse cx="66" cy="48" rx="3" ry="2" fill="#2A1A0A" />
          <Circle cx="54" cy="48" r="1.5" fill="#1A0820" />
          <Circle cx="66" cy="48" r="1.5" fill="#1A0820" />
          <Circle cx="54.6" cy="47.5" r="0.5" fill="white" />
          <Circle cx="66.6" cy="47.5" r="0.5" fill="white" />

          <Path d="M56 55 Q60 57.5 64 55" stroke="#8B5A3A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>

      {speaking && (
        <View style={[styles.waveContainer, { bottom: -s * 0.05 }]}>
          <Animated.View style={[styles.waveBar, { height: s * 0.12 }, w1Style]} />
          <Animated.View style={[styles.waveBar, { height: s * 0.18 }, w2Style]} />
          <Animated.View style={[styles.waveBar, { height: s * 0.15 }, w3Style]} />
          <Animated.View style={[styles.waveBar, { height: s * 0.1 }, w1Style]} />
          <Animated.View style={[styles.waveBar, { height: s * 0.2 }, w2Style]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  waveContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 3,
    backgroundColor: Colors.blue,
    opacity: 0.85,
  },
});
