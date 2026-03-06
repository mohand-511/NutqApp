import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
  Switch,
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

const ACHIEVEMENTS = [
  { id: "first_chat", icon: "chatbubble", label: "أول محادثة", color: Colors.blue },
  { id: "streak_3", icon: "flame", label: "3 أيام متتالية", color: "#F97316" },
  { id: "points_100", icon: "star", label: "100 نقطة", color: Colors.gold },
  { id: "stage_5", icon: "trophy", label: "5 مراحل", color: Colors.purple },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, streak, completedStages, updateProfile, logout, language, setLanguage } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [notifications, setNotifications] = useState(true);
  const [aiVoice, setAiVoice] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  async function handleSave() {
    await updateProfile({ name });
    setEditing(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function handleLogout() {
    Alert.alert(
      "تسجيل الخروج",
      "هل تريد تسجيل الخروج من حسابك؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "خروج",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      "حذف الحساب",
      "هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: handleLogout },
      ]
    );
  }

  const GOAL_LABELS: Record<string, string> = {
    skills: "تطوير المهارات",
    university: "دعم جامعي",
    english: "تحسين الإنجليزية",
    professional: "تطوير مهني",
    ai: "تعلم الذكاء الاصطناعي",
    custom: "هدف مخصص",
  };

  const LEVEL_LABELS: Record<string, string> = {
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
  };

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topInset,
          paddingBottom: botInset + 100,
          paddingHorizontal: 20,
          gap: 20,
        }}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>حسابي</Text>
        </View>

        <View style={styles.profileCard}>
          <LinearGradient
            colors={[`${Colors.blue}15`, `${Colors.purple}08`]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.profileCardBorder]}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarCircle}>
                <LinearGradient
                  colors={[Colors.blue, Colors.purple]}
                  style={styles.avatarGrad}
                >
                  <Text style={styles.avatarLetter}>
                    {profile.name.charAt(0)}
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.profileInfo}>
                {editing ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={name}
                      onChangeText={setName}
                      autoFocus
                      textAlign="right"
                    />
                    <Pressable onPress={handleSave} style={styles.saveBtn}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName}>{profile.name}</Text>
                    <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                )}
                <Text style={styles.profileEmail}>{profile.email}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatItem value={String(points)} label="نقطة" color={Colors.gold} />
              <View style={styles.statsDivider} />
              <StatItem value={String(streak)} label="يوم" color="#F97316" />
              <View style={styles.statsDivider} />
              <StatItem value={String(completedStages.length)} label="مرحلة" color={Colors.blue} />
            </View>

            <View style={styles.goalsRow}>
              <View style={styles.goalTag}>
                <Ionicons name="flag-outline" size={12} color={Colors.blueLight} />
                <Text style={styles.goalTagText}>{GOAL_LABELS[profile.goal] || "لم يحدد بعد"}</Text>
              </View>
              <View style={styles.goalTag}>
                <Ionicons name="bar-chart-outline" size={12} color={Colors.purpleLight} />
                <Text style={styles.goalTagText}>{LEVEL_LABELS[profile.level] || "مبتدئ"}</Text>
              </View>
              <View style={styles.goalTag}>
                <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.goalTagText}>{profile.dailyMinutes} دقيقة/يوم</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإنجازات</Text>
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((ach) => {
              const earned =
                (ach.id === "first_chat" && completedStages.length > 0) ||
                (ach.id === "streak_3" && streak >= 3) ||
                (ach.id === "points_100" && points >= 100) ||
                (ach.id === "stage_5" && completedStages.length >= 5);

              return (
                <View
                  key={ach.id}
                  style={[styles.achievementItem, !earned && styles.achievementLocked]}
                >
                  <View style={[styles.achievementIcon, { backgroundColor: earned ? `${ach.color}20` : Colors.backgroundCard }]}>
                    <Ionicons
                      name={ach.icon as any}
                      size={22}
                      color={earned ? ach.color : Colors.textMuted}
                    />
                  </View>
                  <Text style={[styles.achievementLabel, !earned && { color: Colors.textMuted }]}>
                    {ach.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإعدادات</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="notifications-outline"
              label="الإشعارات"
              right={<Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: Colors.blue }} />}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="mic-outline"
              label="صوت الذكاء الاصطناعي"
              right={<Switch value={aiVoice} onValueChange={setAiVoice} trackColor={{ true: Colors.blue }} />}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="moon-outline"
              label="الوضع الداكن"
              right={<Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: Colors.blue }} />}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="language-outline"
              label="اللغة"
              right={
                <Pressable
                  onPress={() => {
                    setLanguage(language === "ar" ? "en" : "ar");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={styles.langToggle}
                >
                  <Text style={styles.langToggleText}>{language === "ar" ? "العربية" : "English"}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
                </Pressable>
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الخصوصية</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              icon="cloud-download-outline"
              label="تحميل بياناتي"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              right={<Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />}
            />
            <View style={styles.settingDivider} />
            <SettingRow
              icon="shield-outline"
              label="إدارة الجلسات"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              right={<Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />}
            />
          </View>
        </View>

        <View style={styles.dangerSection}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.dangerBtnText}>تسجيل الخروج</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.dangerBtn, styles.deleteBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.dangerBtnText, styles.deleteBtnText]}>حذف الحساب</Text>
          </Pressable>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

function StatItem({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon, label, right, onPress,
}: {
  icon: any; label: string; right?: React.ReactNode; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, onPress && pressed && { opacity: 0.7 }]}
    >
      <View style={styles.settingRight}>
        <Text style={styles.settingLabel}>{label}</Text>
        <View style={styles.settingIconBg}>
          <Ionicons name={icon} size={18} color={Colors.blueLight} />
        </View>
      </View>
      {right && <View>{right}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pageHeader: { paddingTop: 8 },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  profileCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  profileCardBorder: {
    borderWidth: 1.5,
    borderColor: `${Colors.blue}30`,
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  profileInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "flex-end" },
  profileName: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
  },
  editRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.blue,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statsDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: 22, fontFamily: "Cairo_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  goalsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  goalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalTagText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: Colors.textSecondary },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  achievementItem: {
    width: "22%",
    alignItems: "center",
    gap: 6,
  },
  achievementLocked: { opacity: 0.4 },
  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  achievementLabel: {
    fontSize: 10,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  settingsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingIconBg: {
    width: 34,
    height: 34,
    backgroundColor: `${Colors.blue}15`,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: Colors.text },
  settingDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  langToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  langToggleText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: Colors.text },
  dangerSection: { gap: 10 },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  deleteBtn: {
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  dangerBtnText: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: Colors.error },
  deleteBtnText: { fontSize: 14, fontFamily: "Cairo_400Regular" },
});
