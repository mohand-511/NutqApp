import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { GridBackground } from "@/components/GridBackground";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  }

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <GridBackground style={{ flex: 1 }}>
      <View style={{ paddingTop: topInset, flex: 1, paddingHorizontal: 24 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={[Colors.blue, Colors.purple]}
              style={styles.iconGrad}
            >
              <Ionicons name="key-outline" size={32} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>استعادة كلمة المرور</Text>
          <Text style={styles.subtitle}>
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
          </Text>

          {!sent ? (
            <>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="بريدك الإلكتروني"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                onPress={handleSend}
                disabled={loading}
                style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendBtnGrad}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>إرسال الرابط</Text>}
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={styles.successText}>تم إرسال رابط الاستعادة إلى بريدك الإلكتروني</Text>
              <Pressable onPress={() => router.push("/(auth)/login")} style={styles.backToLogin}>
                <Text style={styles.backToLoginText}>العودة لتسجيل الدخول</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </GridBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: 8 },
  backBtn: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.backgroundCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  content: { flex: 1, paddingTop: 40, gap: 20, alignItems: "center" },
  iconCircle: { width: 80, height: 80, borderRadius: 24, overflow: "hidden" },
  iconGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.backgroundCard,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 4,
    gap: 10, width: "100%",
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Cairo_400Regular", color: Colors.text, paddingVertical: 14, textAlign: "right" },
  sendBtn: {
    width: "100%", borderRadius: 16, overflow: "hidden",
    shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  sendBtnGrad: { paddingVertical: 18, alignItems: "center", borderRadius: 16 },
  sendBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  successBox: { alignItems: "center", gap: 16, paddingTop: 20 },
  successText: { fontSize: 15, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "center", lineHeight: 24 },
  backToLogin: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: Colors.backgroundCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  backToLoginText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: Colors.blueLight },
});
