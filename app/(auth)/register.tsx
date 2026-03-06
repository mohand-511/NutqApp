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
import NutqLogo from "@/components/NutqLogo";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
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
    await new Promise((r) => setTimeout(r, 800));
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
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.titleBlock}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <NutqLogo size="lg" showTagline />
            </View>
            <Text style={styles.title}>إنشاء حساب جديد</Text>
            <Text style={styles.subtitle}>انضم إلى مجتمع نطق</Text>
          </View>

          <View style={styles.form}>
            <InputField label="الاسم الكامل" icon="person-outline" value={name} onChange={setName} placeholder="اسمك الكريم" />
            <InputField label="البريد الإلكتروني" icon="mail-outline" value={email} onChange={setEmail} placeholder="example@email.com" keyboardType="email-address" autoCapitalize="none" />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="6 أحرف على الأقل"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerBtnGrad}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>إنشاء الحساب</Text>}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>لديك حساب بالفعل؟ </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginLink}>تسجيل الدخول</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

function InputField({
  label, icon, value, onChange, placeholder, keyboardType = "default", autoCapitalize = "words"
}: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  placeholder: string; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.backgroundCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 24 },
  titleBlock: { gap: 6 },
  title: { fontSize: 28, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  subtitle: { fontSize: 15, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },
  form: { gap: 16 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: Colors.text, textAlign: "right" },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.backgroundCard,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 4, gap: 10,
  },
  inputIcon: { opacity: 0.7 },
  input: { flex: 1, fontSize: 15, fontFamily: "Cairo_400Regular", color: Colors.text, paddingVertical: 14, textAlign: "right" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.error, textAlign: "right", flex: 1 },
  registerBtn: {
    borderRadius: 16, overflow: "hidden", marginTop: 4,
    ...shadow(Colors.blue, 6),
  },
  registerBtnGrad: { paddingVertical: 18, alignItems: "center", borderRadius: 16 },
  registerBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingBottom: 12 },
  loginText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  loginLink: { fontSize: 14, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
});
