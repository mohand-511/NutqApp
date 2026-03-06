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
  const glow = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const ringOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] });
  const ringScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });

  return (
    <View style={hero.wrapper}>
      <LinearGradient
        colors={isDark ? ["#0c0c22", "#12123a", "#0a0a1e"] : ["#EEF2FF", "#E0E7FF", "#F5F3FF"]}
        style={hero.bg}
      />
      <Animated.View style={[hero.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[hero.floatWrap, { transform: [{ translateY: floatY }] }]}>
        <LinearGradient
          colors={["#10B981", "#059669", "#34D399"]}
          style={hero.badge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={hero.badgeLetter}>ن</Text>
        </LinearGradient>
      </Animated.View>
      <Text style={[hero.brandName, { color: isDark ? "#F0F0FF" : "#1E1B4B" }]}>نطق</Text>
      <Text style={[hero.tagline, { color: isDark ? "rgba(160,220,160,0.8)" : "rgba(16,185,129,0.85)" }]}>
        ابدأ رحلتك مع نطق اليوم
      </Text>
    </View>
  );
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { login } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("يرجى ملء جميع الحقول");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    setError("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 700));
    await login(email, name);
    setLoading(false);
    router.replace("/(onboarding)/goals");
  }

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const IC = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const IB = isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.2)";

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: topInset, paddingBottom: botInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              borderRadius: 12, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>

        <LogoHero isDark={isDark} />

        <View style={[form.card, { backgroundColor: isDark ? "rgba(15,15,35,0.85)" : "rgba(255,255,255,0.92)", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)" }]}>
          <Text style={[form.heading, { color: colors.text }]}>إنشاء حساب جديد</Text>
          <Text style={[form.sub, { color: colors.textSecondary }]}>انضم إلى مجتمع نطق</Text>

          <View style={form.fields}>
            {/* Name */}
            <View style={form.group}>
              <Text style={[form.label, { color: colors.text }]}>الاسم الكامل</Text>
              <View style={[form.inputWrap, { backgroundColor: IC, borderColor: IB }]}>
                <Ionicons name="person-outline" size={18} color="#34D399" />
                <TextInput
                  style={[form.input, { color: colors.text }]}
                  placeholder="اسمك الكريم"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />
              </View>
            </View>

            {/* Email */}
            <View style={form.group}>
              <Text style={[form.label, { color: colors.text }]}>البريد الإلكتروني</Text>
              <View style={[form.inputWrap, { backgroundColor: IC, borderColor: IB }]}>
                <Ionicons name="mail-outline" size={18} color="#34D399" />
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
                <Ionicons name="lock-closed-outline" size={18} color="#34D399" />
                <TextInput
                  style={[form.input, { color: colors.text, flex: 1 }]}
                  placeholder="6 أحرف على الأقل"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  textAlign="right"
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {!!error && (
              <View style={form.errorBox}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={form.errorText}>{error}</Text>
              </View>
            )}

            <Pressable onPress={handleRegister} disabled={loading}
              style={({ pressed }) => ({ borderRadius: 16, overflow: "hidden", opacity: pressed ? 0.88 : 1, marginTop: 4 })}>
              <LinearGradient colors={["#10B981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={form.btn}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={form.btnText}>إنشاء الحساب</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={form.regRow}>
            <Text style={[form.regText, { color: colors.textSecondary }]}>لديك حساب بالفعل؟ </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={[form.regLink, { color: "#34D399" }]}>تسجيل الدخول</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

const hero = StyleSheet.create({
  wrapper: {
    alignItems: "center", paddingTop: 28, paddingBottom: 32,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 28,
    overflow: "hidden", position: "relative", minHeight: 220, justifyContent: "center", gap: 8,
  },
  bg: { ...StyleSheet.absoluteFillObject },
  ring: {
    position: "absolute", width: 180, height: 180,
    borderRadius: 9999, borderWidth: 2, borderColor: "#10B981",
  },
  floatWrap: { alignItems: "center" },
  badge: {
    width: 86, height: 86, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#10B981", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 12,
  },
  badgeLetter: { fontSize: 46, fontFamily: "Cairo_700Bold", color: "#fff" },
  brandName: { fontSize: 36, fontFamily: "Cairo_700Bold", letterSpacing: 2 },
  tagline: { fontSize: 13, fontFamily: "Cairo_400Regular" },
});

const form = StyleSheet.create({
  card: {
    marginHorizontal: 16, borderRadius: 24, borderWidth: 1,
    padding: 24, gap: 16,
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
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#EF4444", flex: 1, textAlign: "right" },
  btn: { paddingVertical: 17, alignItems: "center", justifyContent: "center", borderRadius: 16, flexDirection: "row", gap: 8 },
  btnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  regRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  regText: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  regLink: { fontSize: 13, fontFamily: "Cairo_700Bold" },
});
