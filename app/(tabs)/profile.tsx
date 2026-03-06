import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { SaudiAvatar } from "@/components/Avatar";
import { apiRequest } from "@/lib/query-client";

const GOALS = [
  { id: "work", label: "العمل والمهنة", icon: "briefcase" },
  { id: "study", label: "الدراسة", icon: "school" },
  { id: "social", label: "التواصل الاجتماعي", icon: "people" },
  { id: "confidence", label: "الثقة بالنفس", icon: "star" },
];

const LEVELS = [
  { id: "beginner", label: "مبتدئ", color: Colors.success },
  { id: "intermediate", label: "متوسط", color: Colors.gold },
  { id: "advanced", label: "متقدم", color: Colors.purple },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, streak, completedStages, logout } = useApp();
  const [aiCoaching, setAiCoaching] = useState("");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingFetched, setCoachingFetched] = useState(false);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const goalInfo = GOALS.find((g) => g.id === profile.goal) || GOALS[0];
  const levelInfo = LEVELS.find((l) => l.id === profile.level) || LEVELS[0];
  const totalXP = completedStages.length * 75 + points;
  const nextLevelXP = 1000;
  const progress = Math.min((totalXP % nextLevelXP) / nextLevelXP, 1);

  async function handleGetCoaching() {
    if (coachingLoading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCoachingLoading(true);
    try {
      const res = await apiRequest("POST", "/api/coaching-tip", {
        completedStages: completedStages.length,
        points,
        streak,
        goal: goalInfo.label,
        level: levelInfo.label,
      });
      const data = await res.json();
      setAiCoaching(data.tip || "أنت على الطريق الصحيح! واصل المثابرة.");
      setCoachingFetched(true);
    } catch {
      setAiCoaching("عذراً، تعذر الاتصال بنطق AI. حاول مرة أخرى.");
      setCoachingFetched(true);
    }
    setCoachingLoading(false);
  }

  function handleLogout() {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topInset, paddingBottom: botInset + 100 }}
      >
        <View style={styles.topSection}>
          <SaudiAvatar size={100} speaking={coachingLoading} />
          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={[styles.levelBadge, { borderColor: `${levelInfo.color}50`, backgroundColor: `${levelInfo.color}12` }]}>
            <Text style={[styles.levelText, { color: levelInfo.color }]}>{levelInfo.label}</Text>
          </View>
          <Text style={styles.profileGoal}>
            {goalInfo.label}
          </Text>
        </View>

        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>{totalXP} XP</Text>
            <Text style={styles.xpTarget}>{nextLevelXP} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <LinearGradient
              colors={[Colors.blue, Colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.xpHint}>تقدمك نحو المستوى التالي</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="flame" value={String(streak)} label="أيام متتالية" color="#F97316" />
          <StatCard icon="star" value={String(points)} label="نقاط" color={Colors.gold} />
          <StatCard icon="trophy" value={String(completedStages.length)} label="مراحل" color={Colors.purple} />
          <StatCard icon="chatbubble" value={String((points / 5) | 0)} label="محادثة" color={Colors.blue} />
        </View>

        <View style={styles.coachingSection}>
          <LinearGradient
            colors={[`${Colors.blue}12`, `${Colors.purple}08`]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coachingInner}>
            <View style={styles.coachingHeader}>
              <Pressable
                onPress={handleGetCoaching}
                disabled={coachingLoading}
                style={({ pressed }) => [styles.coachBtn, pressed && { opacity: 0.8 }]}
              >
                <LinearGradient
                  colors={[Colors.blue, Colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.coachBtnGrad}
                >
                  {coachingLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="hardware-chip-outline" size={16} color="#fff" />
                      <Text style={styles.coachBtnText}>
                        {coachingFetched ? "تحديث" : "نصيحة AI"}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              <View>
                <Text style={styles.coachingTitle}>مدربك الذكي</Text>
                <Text style={styles.coachingSubtitle}>نطق AI</Text>
              </View>
            </View>

            {coachingFetched ? (
              <View style={styles.coachingMessageBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.blueLight} style={{ marginTop: 2 }} />
                <Text style={styles.coachingMessage}>{aiCoaching}</Text>
              </View>
            ) : !coachingLoading ? (
              <Text style={styles.coachingHint}>
                اضغط لتحصل على تقييم شخصي من الذكاء الاصطناعي بناءً على تقدمك
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>الإنجازات</Text>
          <View style={styles.achievementsGrid}>
            <AchievementBadge
              icon="flame"
              label={`${streak} أيام`}
              sub="مثابر"
              unlocked={streak > 0}
              color="#F97316"
            />
            <AchievementBadge
              icon="star"
              label={`${completedStages.length} مراحل`}
              sub="منجز"
              unlocked={completedStages.length >= 1}
              color={Colors.gold}
            />
            <AchievementBadge
              icon="chatbubble"
              label={`${(points / 5) | 0}`}
              sub="متحدث"
              unlocked={points >= 25}
              color={Colors.blue}
            />
            <AchievementBadge
              icon="trophy"
              label="قمة"
              sub="متميز"
              unlocked={completedStages.length >= 5}
              color={Colors.purple}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>الإعدادات</Text>
          <View style={styles.settingsCard}>
            <SettingsRow icon="person-outline" label="تعديل الملف الشخصي" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingsRow icon="notifications-outline" label="الإشعارات" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingsRow icon="language-outline" label="اللغة والإعدادات" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingsRow icon="help-circle-outline" label="المساعدة والدعم" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingsRow icon="log-out-outline" label="تسجيل الخروج" onPress={handleLogout} danger />
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

function StatCard({ icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: `${color}25` }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AchievementBadge({ icon, label, sub, unlocked, color }: { icon: any; label: string; sub: string; unlocked: boolean; color: string }) {
  return (
    <View style={[styles.achieveBadge, unlocked && { borderColor: `${color}40` }]}>
      <View style={[styles.achieveIcon, unlocked ? { backgroundColor: `${color}15` } : {}]}>
        <Ionicons name={icon} size={22} color={unlocked ? color : Colors.textMuted} />
      </View>
      <Text style={[styles.achieveLabel, !unlocked && { color: Colors.textMuted }]}>{label}</Text>
      <Text style={[styles.achieveSub, !unlocked && { color: Colors.textMuted }]}>{sub}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingsRow, pressed && { backgroundColor: `${Colors.blue}08` }]}>
      <Ionicons name="chevron-back-outline" size={18} color={Colors.textMuted} />
      <Text style={[styles.settingsLabel, danger && { color: "#EF4444" }]}>{label}</Text>
      <View style={[styles.settingsIcon, danger && { backgroundColor: "#EF444415" }]}>
        <Ionicons name={icon} size={18} color={danger ? "#EF4444" : Colors.blue} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topSection: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  profileName: { fontSize: 24, fontFamily: "Cairo_700Bold", color: Colors.text, marginTop: 4 },
  levelBadge: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
  levelText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  profileGoal: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },

  xpSection: { marginHorizontal: 20, marginBottom: 20, gap: 8 },
  xpHeader: { flexDirection: "row", justifyContent: "space-between" },
  xpLabel: { fontSize: 13, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
  xpTarget: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textMuted },
  xpTrack: { height: 10, borderRadius: 5, backgroundColor: Colors.backgroundCard, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 5 },
  xpHint: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textMuted, textAlign: "right" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: "44%", alignItems: "center", gap: 4, padding: 14,
    backgroundColor: Colors.backgroundCard, borderRadius: 16, borderWidth: 1,
  },
  statValue: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },

  coachingSection: { marginHorizontal: 20, marginBottom: 20, borderRadius: 18, overflow: "hidden" },
  coachingInner: { borderWidth: 1.5, borderColor: `${Colors.blue}30`, borderRadius: 18, padding: 16, gap: 14 },
  coachingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coachingTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  coachingSubtitle: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.blueLight, textAlign: "right" },
  coachBtn: { borderRadius: 14, overflow: "hidden" },
  coachBtnGrad: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  coachBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#fff" },
  coachingHint: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textMuted, textAlign: "right", lineHeight: 20 },
  coachingMessageBox: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  coachingMessage: { flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.text, textAlign: "right", lineHeight: 22 },

  achievementsSection: { paddingHorizontal: 20, marginBottom: 20, gap: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right", marginBottom: 2 },
  achievementsGrid: { flexDirection: "row", gap: 10 },
  achieveBadge: {
    flex: 1, alignItems: "center", gap: 6, padding: 12,
    backgroundColor: Colors.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: Colors.backgroundSecondary },
  achieveLabel: { fontSize: 12, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "center" },
  achieveSub: { fontSize: 10, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "center" },

  settingsSection: { paddingHorizontal: 20, marginBottom: 20, gap: 14 },
  settingsCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: Colors.backgroundCard },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: `${Colors.blue}12` },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: "Cairo_600SemiBold", color: Colors.text, textAlign: "right" },
});
