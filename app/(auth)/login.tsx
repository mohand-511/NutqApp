import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

const { width: W } = Dimensions.get("window");

function LogoHero({ isDark }: { isDark: boolean }) {
  const glow1 = useRef(new Animated.Value(0)).current;
  const glow2 = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glow1, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(glow2, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glow2, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const ring1Opacity = glow1.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });
  const ring1Scale = glow1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ring2Opacity = glow2.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] });
  const ring2Scale = glow2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });

  return (
    <View style={hero.wrapper}>
      {/* Gradient background panel */}
      <LinearGradient
        colors={isDark ? ["#0c0c22", "#12123a", "#0a0a1e"] : ["#EEF2FF", "#E0E7FF", "#F5F3FF"]}
        style={hero.bg}
      />

      {/* Decorative glow rings */}
      <Animated.View style={[hero.ring, hero.ringOuter, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
      <Animated.View style={[hero.ring, hero.ringMid, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />

      {/* Floating logo badge */}
      <Animated.View style={[hero.floatWrap, { transform: [{ translateY: floatY }] }]}>
        <LinearGradient
          colors={["#4F46E5", "#7C3AED", "#6366F1"]}
          style={hero.badge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={hero.badgeLetter}>ن</Text>
        </LinearGradient>
      </Animated.View>

      {/* Brand name */}
      <Text style={[hero.brandName, { color: isDark ? "#F0F0FF" : "#1E1B4B" }]}>نطق</Text>
      <Text style={[hero.tagline, { color: isDark ? "rgba(160,160,255,0.8)" : "rgba(99,102,241,0.8)" }]}>
        تعلّم • تحدّث • تميّز
      </Text>

      {/* Feature pills */}
      <View style={hero.pillsRow}>
        {[
          { icon: "hardware-chip-outline", text: "AI محادثة" },
          { icon: "mic-outline",           text: "صوت ذكي" },
          { icon: "trophy-outline",        text: "نقاط ومكافآت" },
        ].map((p) => (
          <View key={p.text} style={[hero.pill, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.25)" }]}>
            <Ionicons name={p.icon as any} size={12} color="#818CF8" />
            <Text style={hero.pillText}>{p.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    setLoading(true);
    setError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 600));
    const name = email.split("@")[0] || "مستخدم";
    await login(email, name);
    setLoading(false);
    router.replace("/(onboarding)/goals");
  }

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const IC = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const IB = isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)";

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: topInset, paddingBottom: botInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              borderRadius: 12, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Hero logo section */}
        <LogoHero isDark={isDark} />

        {/* Form card */}
        <View style={[form.card, { backgroundColor: isDark ? "rgba(15,15,35,0.85)" : "rgba(255,255,255,0.92)", borderColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)" }]}>
          <Text style={[form.heading, { color: colors.text }]}>مرحباً بعودتك</Text>
          <Text style={[form.sub, { color: colors.textSecondary }]}>سجّل دخولك للمتابعة</Text>

          <View style={form.fields}>
            {/* Email */}
            <View style={form.group}>
              <Text style={[form.label, { color: colors.text }]}>البريد الإلكتروني</Text>
              <View style={[form.inputWrap, { backgroundColor: IC, borderColor: IB }]}>
                <Ionicons name="mail-outline" size={18} color="#818CF8" />
                <TextInput
                  style={[form.input, { color: colors.text }]}
                  placeholder="example@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textAlign="right"
                />
              </View>
            </View>

            {/* Password */}
            <View style={form.group}>
              <Text style={[form.label, { color: colors.text }]}>كلمة المرور</Text>
              <View style={[form.inputWrap, { backgroundColor: IC, borderColor: IB }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#818CF8" />
                <TextInput
                  style={[form.input, { color: colors.text, flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                  textAlign="right"
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-start" }}>
              <Text style={[form.forgot, { color: "#818CF8" }]}>نسيت كلمة المرور؟</Text>
            </Pressable>

            {!!error && (
              <View style={form.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={form.errorText}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <Pressable onPress={handleLogin} disabled={loading}
              style={({ pressed }) => ({ borderRadius: 16, overflow: "hidden", opacity: pressed ? 0.88 : 1, marginTop: 4 })}>
              <LinearGradient colors={["#4F46E5", "#7C3AED"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={form.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={form.btnText}>تسجيل الدخول</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={form.divRow}>
              <View style={[form.divLine, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
              <Text style={[form.divText, { color: colors.textMuted }]}>أو</Text>
              <View style={[form.divLine, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }]} />
            </View>

            {/* Social */}
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => [form.social, { backgroundColor: IC, borderColor: IB, opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="logo-google" size={18} color={colors.text} />
              <Text style={[form.socialText, { color: colors.text }]}>المتابعة مع Google</Text>
            </Pressable>
          </View>

          <View style={form.regRow}>
            <Text style={[form.regText, { color: colors.textSecondary }]}>ليس لديك حساب؟ </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={form.regLink}>إنشاء حساب جديد</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

// ── Hero Styles ──────────────────────────────────────────────
const hero = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 36,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    minHeight: 280,
    justifyContent: "center",
    gap: 10,
  },
  bg: { ...StyleSheet.absoluteFillObject },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  ringOuter: { width: 220, height: 220 },
  ringMid:  { width: 160, height: 160 },
  floatWrap: { alignItems: "center" },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  badgeLetter: { fontSize: 52, fontFamily: "Cairo_700Bold", color: "#fff" },
  brandName: { fontSize: 38, fontFamily: "Cairo_700Bold", letterSpacing: 2 },
  tagline: { fontSize: 13, fontFamily: "Cairo_400Regular", letterSpacing: 1 },
  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  pillText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: "#818CF8" },
});

// ── Form Styles ──────────────────────────────────────────────
const form = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    backdropFilter: "blur(20px)",
  },
  heading: { fontSize: 26, fontFamily: "Cairo_700Bold", textAlign: "right" },
  sub: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "right", marginTop: -8 },
  fields: { gap: 14 },
  group: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Cairo_600SemiBold", textAlign: "right" },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 4,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Cairo_400Regular", paddingVertical: 13 },
  forgot: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  errorText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#EF4444", flex: 1, textAlign: "right" },
  btn: { paddingVertical: 17, alignItems: "center", justifyContent: "center", borderRadius: 16, flexDirection: "row", gap: 8 },
  btnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  divRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth },
  divText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  social: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  socialText: { fontSize: 15, fontFamily: "Cairo_600SemiBold" },
  regRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  regText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  regLink: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#818CF8" },
});
