import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { shadow, glowShadow } from "@/constants/shadows";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const { isAuthenticated, hasCompletedOnboarding } = useApp();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isAuthenticated && hasCompletedOnboarding) {
      router.replace("/(tabs)");
    } else if (isAuthenticated && !hasCompletedOnboarding) {
      router.replace("/(onboarding)/goals");
    }
  }, [isAuthenticated, hasCompletedOnboarding]);

  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const btnOpacity = useSharedValue(0);
  const btnTranslate = useSharedValue(20);
  const glowPulse = useSharedValue(0.5);

  useEffect(() => {
    logoScale.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    titleTranslate.value = withDelay(600, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    btnOpacity.value = withDelay(1100, withTiming(1, { duration: 500 }));
    btnTranslate.value = withDelay(1100, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslate.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  return (
    <GridBackground style={{ flex: 1 }}>
      <Animated.View style={[styles.glow, glowStyle]}>
        <Svg width={width} height={width}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={Colors.blue} stopOpacity="0.3" />
              <Stop offset="60%" stopColor={Colors.purple} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={Colors.background} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width / 2} cy={width / 2} r={width / 2} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) }]}>
        <View style={styles.logoSection}>
          <Animated.View style={logoStyle}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoArabic}>ن</Text>
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View style={titleStyle}>
            <Text style={styles.appName}>نطق</Text>
            <Text style={styles.appNameLatin}>NUTQ</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.heroSection, subtitleStyle]}>
          <Text style={styles.headline}>تحدّث، تعلّم، وأنجز</Text>
          <Text style={styles.subheadline}>
            مساعدك الذكي لتطوير مهارات التحدث{"\n"}والتعلم التفاعلي المدعوم بالذكاء الاصطناعي
          </Text>

          <View style={styles.features}>
            {[
              { icon: "🎙", label: "محادثة صوتية" },
              { icon: "🏆", label: "نظام نقاط" },
              { icon: "🧠", label: "ذكاء اصطناعي" },
            ].map((f, i) => (
              <View key={i} style={styles.featureChip}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.ctaSection, btnStyle]}>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={[Colors.blue, Colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>ابدأ الآن</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>تسجيل الدخول</Text>
          </Pressable>

          <Text style={styles.legal}>
            بالمتابعة، أنت توافق على{" "}
            <Text style={styles.legalLink}>سياسة الخصوصية</Text>
            {" "}و{" "}
            <Text style={styles.legalLink}>الشروط والأحكام</Text>
          </Text>
        </Animated.View>
      </View>
    </GridBackground>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    top: height * 0.1,
    left: 0,
    right: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 40,
    gap: 16,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 26,
    overflow: "hidden",
    ...glowShadow(Colors.blue),
  },
  logoGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoArabic: {
    fontSize: 48,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  appName: {
    fontSize: 36,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: 2,
  },
  appNameLatin: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    letterSpacing: 6,
    marginTop: -4,
  },
  heroSection: {
    alignItems: "center",
    gap: 12,
  },
  headline: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  subheadline: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  features: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.backgroundCardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureLabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  ctaSection: {
    gap: 12,
    paddingBottom: 24,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
    ...shadow(Colors.blue, 8),
  },
  primaryBtnGradient: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 16,
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.backgroundCardBorder,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  legal: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.blueLight,
  },
});
