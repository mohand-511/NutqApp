import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { shadow } from "@/constants/shadows";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
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
    await new Promise((r) => setTimeout(r, 800));
    const name = email.split("@")[0] || "مستخدم";
    await login(email, name);
    setLoading(false);
    router.replace("/(onboarding)/goals");
  }

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: topInset, paddingBottom: botInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>مرحباً بعودتك</Text>
            <Text style={styles.subtitle}>سجّل دخولك للمتابعة</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="password"
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                  <Ionicons
                    name={showPass ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={() => router.push("/(auth)/forgot-password")} style={{ alignSelf: "flex-end" }}>
              <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <SocialBtn icon="logo-google" label="Google" />
            {Platform.OS === "ios" && <SocialBtn icon="logo-apple" label="Apple" />}
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>ليس لديك حساب؟ </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.registerLink}>إنشاء حساب</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

function SocialBtn({ icon, label }: { icon: any; label: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.7 }]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <Ionicons name={icon} size={20} color={Colors.text} />
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.text,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  inputIcon: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.text,
    paddingVertical: 14,
    textAlign: "right",
  },
  forgotText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.blueLight,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.error,
    textAlign: "right",
    flex: 1,
  },
  loginBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    ...shadow(Colors.blue, 6),
  },
  loginBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 16,
  },
  loginBtnText: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textMuted,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  socialLabel: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.text,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 12,
  },
  registerText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: Colors.blueLight,
  },
});
