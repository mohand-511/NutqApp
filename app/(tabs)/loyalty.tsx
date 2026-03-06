import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

const REWARDS = [
  {
    id: "jarir",
    name: "جرير",
    description: "قسيمة خصم 50 ريال",
    points: 500,
    color: "#1D4ED8",
    category: "تسوق",
    icon: "book-outline",
  },
  {
    id: "stc",
    name: "STC",
    description: "باقة إنترنت 5GB",
    points: 300,
    color: "#7C3AED",
    category: "اتصالات",
    icon: "wifi-outline",
  },
  {
    id: "albaik",
    name: "البيك",
    description: "وجبة مجانية",
    points: 200,
    color: "#DC2626",
    category: "طعام",
    icon: "fast-food-outline",
  },
  {
    id: "extra",
    name: "إكسترا",
    description: "خصم 100 ريال على الإلكترونيات",
    points: 800,
    color: "#059669",
    category: "إلكترونيات",
    icon: "phone-portrait-outline",
  },
  {
    id: "flynas",
    name: "فلاي ناس",
    description: "تخفيض 200 ريال على الرحلات",
    points: 1000,
    color: "#D97706",
    category: "سفر",
    icon: "airplane-outline",
  },
  {
    id: "starbucks",
    name: "ستاربكس",
    description: "مشروب مجاني",
    points: 150,
    color: "#065F46",
    category: "مقاهي",
    icon: "cafe-outline",
  },
];

const LEVELS = [
  { name: "برونزي", min: 0,    max: 499,      color: "#CD7F32" },
  { name: "فضي",   min: 500,   max: 999,      color: "#9CA3AF" },
  { name: "ذهبي",  min: 1000,  max: 2499,     color: "#F59E0B" },
  { name: "بلاتيني",min: 2500, max: 4999,     color: "#38BDF8" },
  { name: "الماسي",min: 5000,  max: Infinity, color: "#A78BFA" },
];

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { points } = useApp();
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const currentLevel = LEVELS.find((l) => points >= l.min && points <= l.max) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.findIndex((l) => l === currentLevel) + 1];
  const progressInLevel = nextLevel
    ? ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#ffffff";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const pillBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const pillBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const progressTrack = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const disabledBtnBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const disabledBtnText = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";

  async function handleRedeem(reward: (typeof REWARDS)[0]) {
    if (points < reward.points) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRedeemedRewards((prev) => [...prev, reward.id]);
    Alert.alert(
      "تم الاستبدال!",
      `تم استبدال ${reward.points} نقطة بـ${reward.description} من ${reward.name}`,
      [{ text: "رائع!", style: "default" }]
    );
  }

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
        {/* Header */}
        <View style={{ gap: 4, paddingTop: 8 }}>
          <Text style={[s.pageTitle, { color: colors.text }]}>نقاطي</Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>
            اجمع نقاطاً واستبدلها بمكافآت حصرية
          </Text>
        </View>

        {/* Points card */}
        <LinearGradient
          colors={[`${currentLevel.color}22`, `${currentLevel.color}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, overflow: "hidden" }}
        >
          <View style={[s.pointsCardInner, { borderColor: `${currentLevel.color}40` }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={[s.levelBadge, { backgroundColor: `${currentLevel.color}20`, borderColor: currentLevel.color }]}>
                <Ionicons name="trophy" size={14} color={currentLevel.color} />
                <Text style={[s.levelBadgeText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
              </View>
              <Text style={[s.pointsValue, { color: colors.text }]}>{points.toLocaleString()}</Text>
            </View>
            <Text style={[s.pointsLabel, { color: colors.textSecondary }]}>نقطة مجموعة</Text>

            {nextLevel && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[s.progressText, { color: colors.text }]}>
                    المستوى التالي: {nextLevel.name}
                  </Text>
                  <Text style={[s.progressText, { color: colors.textSecondary }]}>
                    {(nextLevel.min - points).toLocaleString()} نقطة متبقية
                  </Text>
                </View>
                <View style={[s.progressBar, { backgroundColor: progressTrack }]}>
                  <Animated.View
                    style={[s.progressFill, {
                      width: `${Math.min(progressInLevel, 100)}%`,
                      backgroundColor: currentLevel.color,
                    }]}
                  />
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Levels row */}
        <View style={{ gap: 12 }}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>المستويات</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {LEVELS.map((level) => {
              const active = currentLevel.name === level.name;
              return (
                <View
                  key={level.name}
                  style={[
                    s.levelPill,
                    {
                      backgroundColor: active ? `${level.color}18` : pillBg,
                      borderColor: active ? level.color : pillBorder,
                    },
                  ]}
                >
                  <View style={[s.levelDot, { backgroundColor: level.color }]} />
                  <Text style={[s.levelPillText, { color: active ? level.color : colors.textSecondary }]}>
                    {level.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Rewards */}
        <View style={{ gap: 10 }}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>المكافآت المتاحة</Text>
          <Text style={[s.sectionSubtitle, { color: colors.textSecondary }]}>
            استبدل نقاطك بمكافآت حصرية من شركاء نطق
          </Text>

          <View style={{ gap: 12 }}>
            {REWARDS.map((reward) => {
              const canRedeem = points >= reward.points;
              const isRedeemed = redeemedRewards.includes(reward.id);

              return (
                <Pressable
                  key={reward.id}
                  onPress={() => !isRedeemed && handleRedeem(reward)}
                  style={({ pressed }) => [
                    s.rewardCard,
                    { backgroundColor: cardBg, borderColor: isRedeemed ? "#10B981" : `${reward.color}30` },
                    pressed && canRedeem && !isRedeemed && { opacity: 0.85 },
                    isRedeemed && { opacity: 0.75 },
                  ]}
                >
                  <LinearGradient
                    colors={[`${reward.color}10`, `${reward.color}04`]}
                    style={StyleSheet.absoluteFill}
                  />

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={[s.rewardIconBg, { backgroundColor: `${reward.color}18` }]}>
                      <Ionicons name={reward.icon as any} size={22} color={reward.color} />
                    </View>
                    <View style={[s.categoryTag, { backgroundColor: `${reward.color}15` }]}>
                      <Text style={[s.categoryText, { color: reward.color }]}>{reward.category}</Text>
                    </View>
                  </View>

                  <Text style={[s.rewardName, { color: colors.text }]}>{reward.name}</Text>
                  <Text style={[s.rewardDesc, { color: colors.textSecondary }]}>{reward.description}</Text>

                  <View style={s.rewardFooter}>
                    {/* Redeem button */}
                    <Pressable
                      onPress={() => !isRedeemed && handleRedeem(reward)}
                      style={[
                        s.redeemBtn,
                        isRedeemed
                          ? { backgroundColor: "#10B981" }
                          : canRedeem
                          ? { backgroundColor: reward.color }
                          : { backgroundColor: disabledBtnBg, borderWidth: 1, borderColor: pillBorder },
                      ]}
                    >
                      {isRedeemed ? (
                        <>
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          <Text style={[s.redeemBtnText, { color: "#fff" }]}>تم الاستبدال</Text>
                        </>
                      ) : canRedeem ? (
                        <Text style={[s.redeemBtnText, { color: "#fff" }]}>استبدل الآن</Text>
                      ) : (
                        <Text style={[s.redeemBtnText, { color: disabledBtnText }]}>غير كافٍ</Text>
                      )}
                    </Pressable>

                    {/* Points cost */}
                    <View style={s.pointsCost}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={[s.pointsCostText, { color: colors.text }]}>{reward.points}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </GridBackground>
  );
}

const s = StyleSheet.create({
  pageTitle:    { fontSize: 28, fontFamily: "Cairo_700Bold", textAlign: "right" },
  pageSubtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "right" },

  pointsCardInner: { borderWidth: 1.5, borderRadius: 22, padding: 20, gap: 8 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
  levelBadgeText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  pointsValue: { fontSize: 42, fontFamily: "Cairo_700Bold" },
  pointsLabel: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "left" },
  progressText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  progressBar: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  sectionTitle:   { fontSize: 18, fontFamily: "Cairo_700Bold", textAlign: "right" },
  sectionSubtitle:{ fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right", marginTop: -4 },

  levelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5 },
  levelDot:  { width: 8, height: 8, borderRadius: 4 },
  levelPillText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },

  rewardCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5, padding: 16, gap: 8 },
  rewardIconBg: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  categoryText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  rewardName: { fontSize: 18, fontFamily: "Cairo_700Bold", textAlign: "right" },
  rewardDesc: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "right" },

  rewardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  redeemBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  redeemBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  pointsCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  pointsCostText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
});
