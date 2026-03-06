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
import { useTheme } from "@/context/ThemeContext";
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
  { id: "beginner", label: "مبتدئ", labelEn: "Beginner", color: "#10B981" },
  { id: "intermediate", label: "متوسط", labelEn: "Intermediate", color: "#F59E0B" },
  { id: "advanced", label: "متقدم", labelEn: "Advanced", color: "#7C3AED" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { profile, points, streak, completedStages, logout, language, setLanguage } = useApp();
  const [aiCoaching, setAiCoaching] = useState("");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingFetched, setCoachingFetched] = useState(false);

  const isRTL = language === "ar";
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
    Alert.alert(
      isRTL ? "تسجيل الخروج" : "Logout",
      isRTL ? "هل تريد تسجيل الخروج؟" : "Are you sure you want to logout?",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        { text: isRTL ? "خروج" : "Logout", style: "destructive", onPress: () => { logout(); router.replace("/"); } },
      ]
    );
  }

  function handleToggleLanguage() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(language === "ar" ? "en" : "ar");
  }

  function handleToggleTheme() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  }

  const cardBg = isDark ? colors.backgroundCard : "#FFFFFF";

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topInset + 8, paddingBottom: botInset + 100 }}
      >
        {/* Avatar + Name */}
        <View style={[s.topSection]}>
          <SaudiAvatar size={100} speaking={coachingLoading} />
          <Text style={[s.profileName, { color: colors.text }]}>{profile.name}</Text>
          <View style={[s.levelBadge, { borderColor: `${levelInfo.color}50`, backgroundColor: `${levelInfo.color}12` }]}>
            <Text style={[s.levelText, { color: levelInfo.color }]}>
              {isRTL ? levelInfo.label : levelInfo.labelEn}
            </Text>
          </View>
          <Text style={[s.profileGoal, { color: colors.textSecondary }]}>{goalInfo.label}</Text>
        </View>

        {/* XP Progress */}
        <View style={[s.xpSection, { paddingHorizontal: 20 }]}>
          <View style={[s.xpHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <Text style={[s.xpLabel, { color: colors.blueLight }]}>{totalXP} XP</Text>
            <Text style={[s.xpTarget, { color: colors.textMuted }]}>{nextLevelXP} XP</Text>
          </View>
          <View style={[s.xpTrack, { backgroundColor: colors.backgroundCardBorder }]}>
            <LinearGradient
              colors={[colors.blue, colors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.xpFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={[s.xpHint, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "تقدمك نحو المستوى التالي" : "Progress toward next level"}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={[s.statsGrid, { paddingHorizontal: 20 }]}>
          {[
            { icon: "flame", value: String(streak), label: isRTL ? "أيام متتالية" : "Day streak", color: "#F97316" },
            { icon: "star", value: String(points), label: isRTL ? "نقاط" : "Points", color: colors.gold },
            { icon: "trophy", value: String(completedStages.length), label: isRTL ? "مراحل" : "Stages", color: colors.purple },
            { icon: "chatbubble", value: String((points / 5) | 0), label: isRTL ? "محادثة" : "Chats", color: colors.blue },
          ].map((stat) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: cardBg, borderColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* AI Coaching */}
        <View style={[s.coachingSection, { marginHorizontal: 20 }]}>
          <LinearGradient
            colors={[`${colors.blue}12`, `${colors.purple}08`]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.coachingInner, { borderColor: `${colors.blue}30` }]}>
            <View style={[s.coachingHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
              <Pressable
                onPress={handleGetCoaching}
                disabled={coachingLoading}
                style={({ pressed }) => [s.coachBtn, pressed && { opacity: 0.8 }]}
              >
                <LinearGradient
                  colors={[colors.blue, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.coachBtnGrad}
                >
                  {coachingLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="hardware-chip-outline" size={16} color="#fff" />
                      <Text style={s.coachBtnText}>
                        {coachingFetched ? (isRTL ? "تحديث" : "Refresh") : (isRTL ? "نصيحة AI" : "AI Tip")}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              <View>
                <Text style={[s.coachingTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {isRTL ? "مدربك الذكي" : "Your AI Coach"}
                </Text>
                <Text style={[s.coachingSubtitle, { color: colors.blueLight, textAlign: isRTL ? "right" : "left" }]}>
                  نطق AI
                </Text>
              </View>
            </View>
            {coachingFetched ? (
              <View style={[s.coachingMessageBox, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.blueLight} style={{ marginTop: 2 }} />
                <Text style={[s.coachingMessage, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                  {aiCoaching}
                </Text>
              </View>
            ) : !coachingLoading ? (
              <Text style={[s.coachingHint, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "اضغط لتحصل على تقييم شخصي من الذكاء الاصطناعي" : "Tap for a personalized AI assessment"}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Achievements */}
        <View style={[s.achievementsSection, { paddingHorizontal: 20 }]}>
          <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "الإنجازات" : "Achievements"}
          </Text>
          <View style={s.achievementsGrid}>
            {[
              { icon: "flame", label: `${streak} ${isRTL ? "أيام" : "days"}`, sub: isRTL ? "مثابر" : "Dedicated", unlocked: streak > 0, color: "#F97316" },
              { icon: "star", label: `${completedStages.length} ${isRTL ? "مراحل" : "stages"}`, sub: isRTL ? "منجز" : "Achiever", unlocked: completedStages.length >= 1, color: colors.gold },
              { icon: "chatbubble", label: `${(points / 5) | 0}`, sub: isRTL ? "متحدث" : "Speaker", unlocked: points >= 25, color: colors.blue },
              { icon: "trophy", label: isRTL ? "قمة" : "Top", sub: isRTL ? "متميز" : "Elite", unlocked: completedStages.length >= 5, color: colors.purple },
            ].map((a) => (
              <View key={a.sub} style={[s.achieveBadge, { backgroundColor: cardBg, borderColor: a.unlocked ? `${a.color}35` : colors.border }]}>
                <View style={[s.achieveIcon, { backgroundColor: a.unlocked ? `${a.color}15` : colors.backgroundCardBorder }]}>
                  <Ionicons name={a.icon as any} size={22} color={a.unlocked ? a.color : colors.textMuted} />
                </View>
                <Text style={[s.achieveLabel, { color: a.unlocked ? colors.text : colors.textMuted }]}>{a.label}</Text>
                <Text style={[s.achieveSub, { color: a.unlocked ? colors.textSecondary : colors.textMuted }]}>{a.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={[s.settingsSection, { paddingHorizontal: 20 }]}>
          <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "الإعدادات" : "Settings"}
          </Text>
          <View style={[s.settingsCard, { borderColor: colors.border }]}>
            {/* Theme Toggle */}
            <Pressable
              onPress={handleToggleTheme}
              style={({ pressed }) => [s.settingsRow, { backgroundColor: pressed ? `${colors.blue}08` : cardBg }]}
            >
              <View style={[s.togglePill, { backgroundColor: isDark ? colors.purple : colors.gold }]}>
                <View style={[s.toggleThumb, { marginLeft: isDark ? 2 : 20 }]} />
              </View>
              <Text style={[s.settingsLabel, { flex: 1, color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {isDark ? (isRTL ? "الوضع الداكن" : "Dark Mode") : (isRTL ? "الوضع الفاتح" : "Light Mode")}
              </Text>
              <View style={[s.settingsIconBox, { backgroundColor: `${isDark ? colors.purple : colors.gold}15` }]}>
                <Ionicons name={isDark ? "moon" : "sunny"} size={18} color={isDark ? colors.purple : colors.gold} />
              </View>
            </Pressable>

            <View style={[s.rowDivider, { backgroundColor: colors.border }]} />

            {/* Language Toggle */}
            <Pressable
              onPress={handleToggleLanguage}
              style={({ pressed }) => [s.settingsRow, { backgroundColor: pressed ? `${colors.blue}08` : cardBg }]}
            >
              <View style={[s.langPill, { borderColor: colors.border }]}>
                <View style={[s.langOption, language === "ar" && { backgroundColor: colors.blue }]}>
                  <Text style={[s.langText, { color: language === "ar" ? "#fff" : colors.textMuted }]}>ع</Text>
                </View>
                <View style={[s.langOption, language === "en" && { backgroundColor: colors.blue }]}>
                  <Text style={[s.langText, { color: language === "en" ? "#fff" : colors.textMuted }]}>EN</Text>
                </View>
              </View>
              <Text style={[s.settingsLabel, { flex: 1, color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "اللغة / Language" : "Language / اللغة"}
              </Text>
              <View style={[s.settingsIconBox, { backgroundColor: `${colors.blue}12` }]}>
                <Ionicons name="language-outline" size={18} color={colors.blue} />
              </View>
            </Pressable>

            <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="person-outline" label={isRTL ? "تعديل الملف الشخصي" : "Edit Profile"} onPress={() => {}} colors={colors} cardBg={cardBg} />
            <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="notifications-outline" label={isRTL ? "الإشعارات" : "Notifications"} onPress={() => {}} colors={colors} cardBg={cardBg} />
            <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="help-circle-outline" label={isRTL ? "المساعدة والدعم" : "Help & Support"} onPress={() => {}} colors={colors} cardBg={cardBg} />
            <View style={[s.rowDivider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="log-out-outline" label={isRTL ? "تسجيل الخروج" : "Logout"} onPress={handleLogout} danger colors={colors} cardBg={cardBg} />
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

function SettingsRow({ icon, label, onPress, danger, colors, cardBg }: {
  icon: any; label: string; onPress: () => void; danger?: boolean; colors: any; cardBg: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.settingsRow, { backgroundColor: pressed ? `${colors.blue}08` : cardBg }]}>
      <Ionicons name="chevron-back-outline" size={18} color={colors.textMuted} />
      <Text style={[s.settingsLabel, { flex: 1, color: danger ? "#EF4444" : colors.text, textAlign: "right" }]}>
        {label}
      </Text>
      <View style={[s.settingsIconBox, { backgroundColor: danger ? "#EF444415" : `${colors.blue}12` }]}>
        <Ionicons name={icon} size={18} color={danger ? "#EF4444" : colors.blue} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  topSection: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  profileName: { fontSize: 24, fontFamily: "Cairo_700Bold", marginTop: 4 },
  levelBadge: { paddingHorizontal: 18, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
  levelText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  profileGoal: { fontSize: 13, fontFamily: "Cairo_400Regular" },

  xpSection: { marginBottom: 20, gap: 8 },
  xpHeader: { justifyContent: "space-between" },
  xpLabel: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  xpTarget: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  xpTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 5 },
  xpHint: { fontSize: 11, fontFamily: "Cairo_400Regular" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, minWidth: "44%", alignItems: "center", gap: 4, padding: 14, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Cairo_400Regular" },

  coachingSection: { marginBottom: 20, borderRadius: 18, overflow: "hidden" },
  coachingInner: { borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 14 },
  coachingHeader: { alignItems: "center", justifyContent: "space-between" },
  coachingTitle: { fontSize: 16, fontFamily: "Cairo_700Bold" },
  coachingSubtitle: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  coachBtn: { borderRadius: 14, overflow: "hidden" },
  coachBtnGrad: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 14 },
  coachBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#fff" },
  coachingHint: { fontSize: 13, fontFamily: "Cairo_400Regular", lineHeight: 20 },
  coachingMessageBox: { alignItems: "flex-start", gap: 8 },
  coachingMessage: { flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 22 },

  achievementsSection: { marginBottom: 20, gap: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Cairo_700Bold", marginBottom: 2 },
  achievementsGrid: { flexDirection: "row", gap: 10 },
  achieveBadge: { flex: 1, alignItems: "center", gap: 6, padding: 12, borderRadius: 16, borderWidth: 1 },
  achieveIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  achieveLabel: { fontSize: 12, fontFamily: "Cairo_700Bold", textAlign: "center" },
  achieveSub: { fontSize: 10, fontFamily: "Cairo_400Regular", textAlign: "center" },

  settingsSection: { marginBottom: 20, gap: 14 },
  settingsCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowDivider: { height: 1, marginHorizontal: 16 },
  settingsIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },

  togglePill: { width: 44, height: 24, borderRadius: 12, justifyContent: "center", padding: 2 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },

  langPill: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  langOption: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  langText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
});
