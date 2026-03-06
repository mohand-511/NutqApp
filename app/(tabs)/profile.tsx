import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, ActivityIndicator, Switch, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { apiRequest } from "@/lib/query-client";
import NutqLogo from "@/components/NutqLogo";

// ─────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────
const LEVEL_MAP: Record<string, { labelAr: string; labelEn: string; color: string; next: string }> = {
  beginner:     { labelAr: "مبتدئ",  labelEn: "Beginner",     color: "#10B981", next: "intermediate" },
  intermediate: { labelAr: "متوسط",  labelEn: "Intermediate", color: "#F59E0B", next: "advanced" },
  advanced:     { labelAr: "متقدم",  labelEn: "Advanced",     color: "#7C3AED", next: "advanced" },
};

const ACHIEVEMENTS = [
  { id: "first_chat",   icon: "chatbubble-ellipses", color: "#6366F1", titleAr: "أول محادثة",    titleEn: "First Chat",    descAr: "أجريت أول محادثة مع الذكاء الاصطناعي", descEn: "Had your first AI conversation" },
  { id: "streak_7",     icon: "flame",               color: "#F59E0B", titleAr: "7 أيام متواصلة", titleEn: "7-Day Streak",  descAr: "استخدمت التطبيق 7 أيام متواصلة",       descEn: "Used the app 7 days in a row" },
  { id: "stage_3",      icon: "trophy",              color: "#10B981", titleAr: "أكملت 3 مراحل",  titleEn: "3 Stages Done", descAr: "أتممت ثلاث مراحل تعليمية",             descEn: "Completed three learning stages" },
  { id: "points_500",   icon: "star",                color: "#EC4899", titleAr: "500 نقطة",        titleEn: "500 Points",    descAr: "جمعت 500 نقطة ولاء",                   descEn: "Earned 500 loyalty points" },
];

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function SettingRow({
  icon, color, titleAr, titleEn, isRTL, isDark, colors,
  value, onToggle, subtitle,
}: {
  icon: string; color: string; titleAr: string; titleEn: string;
  isRTL: boolean; isDark: boolean; colors: any;
  value?: boolean; onToggle?: () => void; subtitle?: string;
}) {
  return (
    <View style={[sStyles.row, { flexDirection: isRTL ? "row" : "row-reverse", borderBottomColor: colors.border }]}>
      <View style={[sStyles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[sStyles.rowTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL ? titleAr : titleEn}
        </Text>
        {subtitle && (
          <Text style={[sStyles.rowSub, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {onToggle !== undefined && value !== undefined && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: color }}
          thumbColor="#fff"
          ios_backgroundColor={colors.border}
        />
      )}
    </View>
  );
}

function SectionCard({ children, title, titleEn, isRTL, colors, icon, iconColor }: any) {
  return (
    <View style={[cStyles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.glassBorder }]}>
      <View style={[cStyles.cardHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
        <View style={[cStyles.cardIconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[cStyles.cardTitle, { color: colors.text }]}>{isRTL ? title : titleEn}</Text>
      </View>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const { profile, points, streak, xp, completedStages, settings, logout, updateSettings, language, setLanguage } = useApp();

  const [aiCoaching, setAiCoaching] = useState("");
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingFetched, setCoachingFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "settings">("overview");
  const themeAnim = useRef(new Animated.Value(isDark ? 0 : 1)).current;

  const isRTL = language === "ar";
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const levelInfo = LEVEL_MAP[profile.level] || LEVEL_MAP.beginner;
  const xpToNext = 1000 - (xp % 1000);
  const xpPercent = ((xp % 1000) / 1000) * 100;

  function handleToggleTheme() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
    toggleTheme();
  }

  function handleToggleLang() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(language === "ar" ? "en" : "ar");
  }

  async function handleLogout() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace("/");
  }

  async function fetchCoaching() {
    if (coachingFetched || coachingLoading) return;
    setCoachingLoading(true);
    try {
      const data = await apiRequest("POST", "/api/coaching-tip", {
        completedStages: completedStages.length,
        points,
        streak,
        goal: profile.goal || "التحدث بثقة",
        level: profile.level,
      });
      setAiCoaching(data.tip || "");
      setCoachingFetched(true);
    } catch {
      setAiCoaching(isRTL ? "أنت على المسار الصحيح! استمر في التدريب." : "You're on the right track! Keep practicing.");
      setCoachingFetched(true);
    } finally {
      setCoachingLoading(false);
    }
  }

  const unlockedAchievements = ACHIEVEMENTS.filter((a) => {
    if (a.id === "first_chat") return completedStages.length > 0 || points > 0;
    if (a.id === "streak_7") return streak >= 7;
    if (a.id === "stage_3") return completedStages.length >= 3;
    if (a.id === "points_500") return points >= 500;
    return false;
  });

  // ── Activity dummy data (realistic) ──────────────────────────────────────
  const ACTIVITY = [
    { id: 1, icon: "chatbubble-ellipses", color: "#6366F1", titleAr: "محادثة مع الذكاء الاصطناعي", titleEn: "AI Conversation", timeAr: "منذ ساعة",        timeEn: "1h ago",  pts: +5 },
    { id: 2, icon: "trophy",              color: "#F59E0B", titleAr: "أكملت مرحلة التعريف",         titleEn: "Finished Intro Stage", timeAr: "منذ 3 ساعات", timeEn: "3h ago",  pts: +50 },
    { id: 3, icon: "flame",               color: "#EF4444", titleAr: "سلسلة 3 أيام",                titleEn: "3-Day Streak",    timeAr: "أمس",             timeEn: "Yesterday", pts: +20 },
    { id: 4, icon: "star",                color: "#10B981", titleAr: "جمعت 100 نقطة",               titleEn: "Earned 100 Points", timeAr: "منذ يومين",     timeEn: "2d ago",  pts: +100 },
    { id: 5, icon: "mic",                 color: "#EC4899", titleAr: "تدريب صوتي",                  titleEn: "Voice Practice",    timeAr: "منذ 3 أيام",    timeEn: "3d ago",  pts: +15 },
    { id: 6, icon: "book",                color: "#8B5CF6", titleAr: "تعلّمت كلمة اليوم",           titleEn: "Word of the Day",   timeAr: "منذ 4 أيام",    timeEn: "4d ago",  pts: +5 },
  ];

  return (
    <GridBackground>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + 8,
          paddingBottom: botInset + 100,
          paddingHorizontal: 16,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[hStyles.header, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <NutqLogo size="sm" />
          <Pressable onPress={handleLogout} style={hStyles.logoutBtn} hitSlop={12}>
            <Ionicons name="log-out-outline" size={20} color={colors.textMuted} style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }} />
          </Pressable>
        </View>

        {/* ── Profile Hero Card ────────────────────────────────────────── */}
        <LinearGradient
          colors={isDark ? ["#1a1a3e", "#0d0d24"] : ["#EEF2FF", "#F0F4FF"]}
          style={[heroStyles.card, { borderColor: colors.glassBorder }]}
        >
          <View style={[heroStyles.top, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={heroStyles.avatarWrap}>
              <LinearGradient colors={["#6366F1", "#4F46E5"]} style={heroStyles.avatar}>
                <Text style={heroStyles.avatarLetter}>
                  {(profile.name || "م")[0]}
                </Text>
              </LinearGradient>
              <View style={[heroStyles.levelDot, { backgroundColor: levelInfo.color }]} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[heroStyles.name, { color: colors.text, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                {profile.name}
              </Text>
              <View style={[heroStyles.levelRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                <View style={[heroStyles.levelBadge, { backgroundColor: `${levelInfo.color}20`, borderColor: levelInfo.color }]}>
                  <Text style={[heroStyles.levelText, { color: levelInfo.color }]}>
                    {isRTL ? levelInfo.labelAr : levelInfo.labelEn}
                  </Text>
                </View>
              </View>
              <Text style={[heroStyles.email, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                {profile.email}
              </Text>
            </View>
          </View>

          {/* XP Bar */}
          <View style={{ gap: 6 }}>
            <View style={[heroStyles.xpRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
              <Text style={[heroStyles.xpLabel, { color: colors.textSecondary }]}>
                {isRTL ? `${xpToNext} XP للمستوى التالي` : `${xpToNext} XP to next level`}
              </Text>
              <Text style={[heroStyles.xpVal, { color: colors.text }]}>{xp.toLocaleString()} XP</Text>
            </View>
            <View style={[heroStyles.xpBar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[heroStyles.xpFill, { width: `${xpPercent}%` }]}
              />
            </View>
          </View>
        </LinearGradient>

        {/* ── Stats Row ────────────────────────────────────────────────── */}
        <View style={statStyles.row}>
          {[
            { val: points.toLocaleString(), labelAr: "نقطة",    labelEn: "Points",  icon: "star",         color: "#F59E0B" },
            { val: String(streak),           labelAr: "يوم سلسلة", labelEn: "Streak",  icon: "flame",        color: "#EF4444" },
            { val: String(completedStages.length), labelAr: "مرحلة",   labelEn: "Stages",  icon: "trophy",       color: "#10B981" },
            { val: String(xp),              labelAr: "XP",       labelEn: "XP",      icon: "flash",        color: "#6366F1" },
          ].map((s) => (
            <View key={s.labelAr} style={[statStyles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.glassBorder }]}>
              <View style={[statStyles.iconWrap, { backgroundColor: `${s.color}15` }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={[statStyles.val, { color: colors.text }]}>{s.val}</Text>
              <Text style={[statStyles.label, { color: colors.textMuted }]}>{isRTL ? s.labelAr : s.labelEn}</Text>
            </View>
          ))}
        </View>

        {/* ── Tab Selector ─────────────────────────────────────────────── */}
        <View style={[tabSt.row, { backgroundColor: colors.backgroundCard, borderColor: colors.glassBorder }]}>
          {(["overview", "activity", "settings"] as const).map((t) => {
            const labels = { overview: ["نظرة عامة", "Overview"], activity: ["النشاط", "Activity"], settings: ["الإعدادات", "Settings"] };
            return (
              <Pressable
                key={t}
                onPress={() => setActiveTab(t)}
                style={[tabSt.tab, activeTab === t && { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)" }]}
              >
                <Text style={[tabSt.tabText, { color: activeTab === t ? "#6366F1" : colors.textMuted }]}>
                  {isRTL ? labels[t][0] : labels[t][1]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Achievements */}
            <SectionCard title="الإنجازات" titleEn="Achievements" icon="ribbon" iconColor="#F59E0B" isRTL={isRTL} colors={colors}>
              <View style={{ gap: 10, marginTop: 12 }}>
                {ACHIEVEMENTS.map((a) => {
                  const unlocked = unlockedAchievements.find((u) => u.id === a.id);
                  return (
                    <View key={a.id} style={[achSt.row, { flexDirection: isRTL ? "row" : "row-reverse", opacity: unlocked ? 1 : 0.4 }]}>
                      <View style={[achSt.icon, { backgroundColor: `${a.color}20` }]}>
                        <Ionicons name={a.icon as any} size={20} color={a.color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[achSt.title, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                          {isRTL ? a.titleAr : a.titleEn}
                        </Text>
                        <Text style={[achSt.desc, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                          {isRTL ? a.descAr : a.descEn}
                        </Text>
                      </View>
                      {unlocked && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                    </View>
                  );
                })}
              </View>
            </SectionCard>

            {/* AI Coaching */}
            <SectionCard title="مدرّبك الذكي" titleEn="AI Coaching" icon="sparkles" iconColor="#6366F1" isRTL={isRTL} colors={colors}>
              <View style={{ marginTop: 12, gap: 12 }}>
                {!coachingFetched ? (
                  <Pressable
                    onPress={fetchCoaching}
                    style={[coachSt.btn, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.4)" }]}
                  >
                    {coachingLoading ? (
                      <ActivityIndicator color="#6366F1" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color="#6366F1" />
                        <Text style={[coachSt.btnText, { color: "#6366F1" }]}>
                          {isRTL ? "احصل على نصيحتك الشخصية" : "Get your personalized tip"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <View style={[coachSt.tipBox, { backgroundColor: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }]}>
                    <Ionicons name="sparkles" size={16} color="#6366F1" style={{ alignSelf: isRTL ? "flex-start" : "flex-end" }} />
                    <Text style={[coachSt.tipText, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                      {aiCoaching}
                    </Text>
                    <Pressable onPress={() => { setCoachingFetched(false); setAiCoaching(""); }} style={{ alignSelf: isRTL ? "flex-start" : "flex-end" }}>
                      <Text style={[coachSt.refresh, { color: "#6366F1" }]}>{isRTL ? "تحديث" : "Refresh"}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </SectionCard>
          </>
        )}

        {/* ══ ACTIVITY ══════════════════════════════════════════════════ */}
        {activeTab === "activity" && (
          <SectionCard title="سجل النشاط" titleEn="Activity Log" icon="time" iconColor="#6366F1" isRTL={isRTL} colors={colors}>
            <View style={{ marginTop: 12, gap: 1 }}>
              {ACTIVITY.map((a, i) => (
                <View key={a.id} style={[actSt.row, {
                  flexDirection: isRTL ? "row" : "row-reverse",
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < ACTIVITY.length - 1 ? StyleSheet.hairlineWidth : 0,
                }]}>
                  <View style={[actSt.icon, { backgroundColor: `${a.color}15` }]}>
                    <Ionicons name={a.icon as any} size={16} color={a.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[actSt.title, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                      {isRTL ? a.titleAr : a.titleEn}
                    </Text>
                    <Text style={[actSt.time, { color: colors.textMuted, textAlign: isRTL ? "right" : "left" }]}>
                      {isRTL ? a.timeAr : a.timeEn}
                    </Text>
                  </View>
                  <Text style={[actSt.pts, { color: "#10B981" }]}>+{a.pts}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* ══ SETTINGS ══════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <>
            {/* Appearance */}
            <SectionCard title="المظهر واللغة" titleEn="Appearance & Language" icon="color-palette" iconColor="#8B5CF6" isRTL={isRTL} colors={colors}>
              <View style={{ marginTop: 4 }}>
                <SettingRow
                  icon={isDark ? "moon" : "sunny"}
                  color="#8B5CF6"
                  titleAr="الوضع الداكن"
                  titleEn="Dark Mode"
                  isRTL={isRTL} isDark={isDark} colors={colors}
                  value={isDark}
                  onToggle={handleToggleTheme}
                />
                <View style={[sStyles.row, { flexDirection: isRTL ? "row" : "row-reverse", borderBottomColor: colors.border }]}>
                  <View style={[sStyles.iconWrap, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
                    <Text style={{ fontSize: 16 }}>{language === "ar" ? "🇸🇦" : "🇬🇧"}</Text>
                  </View>
                  <Text style={[sStyles.rowTitle, { color: colors.text, flex: 1, textAlign: isRTL ? "right" : "left" }]}>
                    {isRTL ? "اللغة" : "Language"}
                  </Text>
                  <Pressable onPress={handleToggleLang} style={[langSt.pill, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.4)" }]}>
                    <Text style={[langSt.pillText, { color: "#6366F1" }]}>{language === "ar" ? "العربية" : "English"}</Text>
                    <Ionicons name="chevron-forward" size={12} color="#6366F1" style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
                  </Pressable>
                </View>
              </View>
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="الإشعارات" titleEn="Notifications" icon="notifications" iconColor="#F59E0B" isRTL={isRTL} colors={colors}>
              <View style={{ marginTop: 4 }}>
                <SettingRow
                  icon="notifications-outline" color="#F59E0B"
                  titleAr="إشعارات التطبيق" titleEn="App Notifications"
                  subtitle={isRTL ? "إشعارات التحديثات والتذكيرات" : "Updates and reminder notifications"}
                  isRTL={isRTL} isDark={isDark} colors={colors}
                  value={settings.notificationsEnabled}
                  onToggle={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
                />
                <SettingRow
                  icon="alarm-outline" color="#F59E0B"
                  titleAr="تذكير يومي" titleEn="Daily Reminder"
                  subtitle={isRTL ? "تذكير لممارسة التحدث يومياً" : "Remind you to practice daily"}
                  isRTL={isRTL} isDark={isDark} colors={colors}
                  value={settings.dailyReminder}
                  onToggle={() => updateSettings({ dailyReminder: !settings.dailyReminder })}
                />
              </View>
            </SectionCard>

            {/* Sound & Privacy */}
            <SectionCard title="الصوت والخصوصية" titleEn="Sound & Privacy" icon="shield-checkmark" iconColor="#10B981" isRTL={isRTL} colors={colors}>
              <View style={{ marginTop: 4 }}>
                <SettingRow
                  icon="volume-high-outline" color="#10B981"
                  titleAr="الأصوات والموسيقى" titleEn="Sounds & Music"
                  subtitle={isRTL ? "أصوات التطبيق وتأثيرات المحادثة" : "App sounds and chat effects"}
                  isRTL={isRTL} isDark={isDark} colors={colors}
                  value={settings.soundEnabled}
                  onToggle={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                />
                <SettingRow
                  icon="eye-off-outline" color="#10B981"
                  titleAr="وضع الخصوصية" titleEn="Privacy Mode"
                  subtitle={isRTL ? "إخفاء معلوماتك الشخصية" : "Hide your personal information"}
                  isRTL={isRTL} isDark={isDark} colors={colors}
                  value={settings.privacyMode}
                  onToggle={() => updateSettings({ privacyMode: !settings.privacyMode })}
                />
              </View>
            </SectionCard>

            {/* About */}
            <SectionCard title="عن نطق" titleEn="About Nutq" icon="information-circle" iconColor="#6366F1" isRTL={isRTL} colors={colors}>
              <View style={{ marginTop: 12, gap: 10 }}>
                <View style={aboutSt.row}>
                  <NutqLogo size="md" showTagline />
                </View>
                {[
                  { labelAr: "الإصدار", labelEn: "Version", val: "2.0.0" },
                  { labelAr: "المطور", labelEn: "Developer", val: "Nutq Team" },
                  { labelAr: "التقنية", labelEn: "Technology", val: "AI-Powered" },
                ].map((r) => (
                  <View key={r.labelAr} style={[aboutSt.infoRow, { flexDirection: isRTL ? "row" : "row-reverse", borderBottomColor: colors.border }]}>
                    <Text style={[aboutSt.key, { color: colors.textSecondary }]}>{isRTL ? r.labelAr : r.labelEn}</Text>
                    <Text style={[aboutSt.value, { color: colors.text }]}>{r.val}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>

            {/* Logout */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [logSt.btn, { opacity: pressed ? 0.75 : 1, borderColor: "rgba(239,68,68,0.3)", backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)" }]}
            >
              <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }} />
              <Text style={logSt.text}>{isRTL ? "تسجيل الخروج" : "Sign Out"}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </GridBackground>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const hStyles = StyleSheet.create({
  header: { justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  logoutBtn: { padding: 6 },
});

const heroStyles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  top: { gap: 14, alignItems: "center" },
  avatarWrap: { position: "relative" },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 32, fontFamily: "Cairo_700Bold", color: "#fff" },
  levelDot: { position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#fff" },
  name: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  levelRow: { gap: 8, alignItems: "center" },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  levelText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  email: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  xpRow: { justifyContent: "space-between" },
  xpLabel: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  xpVal: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  xpBar: { height: 8, borderRadius: 4, overflow: "hidden" },
  xpFill: { height: "100%", borderRadius: 4 },
});

const statStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: "center", gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  val: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  label: { fontSize: 10, fontFamily: "Cairo_400Regular" },
});

const tabSt = StyleSheet.create({
  row: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
});

const cStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16 },
  cardHeader: { alignItems: "center", gap: 10 },
  cardIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", flex: 1 },
});

const achSt = StyleSheet.create({
  row: { gap: 12, alignItems: "center", paddingVertical: 8 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Cairo_400Regular" },
});

const coachSt = StyleSheet.create({
  btn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, borderWidth: 1 },
  btnText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  tipBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  tipText: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 24 },
  refresh: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
});

const actSt = StyleSheet.create({
  row: { gap: 12, alignItems: "center", paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  time: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  pts: { fontSize: 13, fontFamily: "Cairo_700Bold" },
});

const sStyles = StyleSheet.create({
  row: { gap: 12, alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { flex: 1, fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  rowSub: { fontSize: 11, fontFamily: "Cairo_400Regular" },
});

const langSt = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
});

const aboutSt = StyleSheet.create({
  row: { alignItems: "center", paddingVertical: 8 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  key: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  value: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
});

const logSt = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1 },
  text: { fontSize: 15, fontFamily: "Cairo_700Bold", color: "#EF4444" },
});
