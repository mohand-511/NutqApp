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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

const REWARDS = [
  {
    id: "jarir",
    name: "جرير",
    nameEn: "Jarir",
    description: "قسيمة خصم 50 ريال",
    points: 500,
    color: "#1D4ED8",
    category: "تسوق",
    icon: "book-outline",
  },
  {
    id: "stc",
    name: "STC",
    nameEn: "STC",
    description: "باقة إنترنت 5GB",
    points: 300,
    color: "#7C3AED",
    category: "اتصالات",
    icon: "wifi-outline",
  },
  {
    id: "albaik",
    name: "البيك",
    nameEn: "AlBaik",
    description: "وجبة مجانية",
    points: 200,
    color: "#DC2626",
    category: "طعام",
    icon: "fast-food-outline",
  },
  {
    id: "extra",
    name: "إكسترا",
    nameEn: "Extra",
    description: "خصم 100 ريال على الإلكترونيات",
    points: 800,
    color: "#059669",
    category: "إلكترونيات",
    icon: "phone-portrait-outline",
  },
  {
    id: "flynas",
    name: "فلاي ناس",
    nameEn: "Flynas",
    description: "تخفيض 200 ريال على الرحلات",
    points: 1000,
    color: "#D97706",
    category: "سفر",
    icon: "airplane-outline",
  },
  {
    id: "starbucks",
    name: "ستاربكس",
    nameEn: "Starbucks",
    description: "مشروب مجاني",
    points: 150,
    color: "#065F46",
    category: "مقاهي",
    icon: "cafe-outline",
  },
];

const LEVELS = [
  { name: "برونزي", min: 0, max: 499, color: "#CD7F32" },
  { name: "فضي", min: 500, max: 999, color: "#9CA3AF" },
  { name: "ذهبي", min: 1000, max: 2499, color: Colors.gold },
  { name: "بلاتيني", min: 2500, max: 4999, color: Colors.blueLight },
  { name: "الماسي", min: 5000, max: Infinity, color: "#A78BFA" },
];

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { points } = useApp();
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
  const cardBg = isDark ? colors.backgroundCard : "#FFFFFF";

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const currentLevel = LEVELS.find((l) => points >= l.min && points <= l.max) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.findIndex((l) => l === currentLevel) + 1];
  const progressInLevel = nextLevel
    ? ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  async function handleRedeem(reward: typeof REWARDS[0]) {
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
          paddingBottom: 120,
          paddingHorizontal: 20,
          gap: 20,
        }}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>نقاطي</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>اجمع نقاطاً واستبدلها بمكافآت حصرية</Text>
        </View>

        <LinearGradient
          colors={[`${currentLevel.color}20`, `${Colors.purple}10`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pointsCard}
        >
          <View style={[styles.pointsCardBorder, { borderColor: `${currentLevel.color}40` }]}>
            <View style={styles.pointsTop}>
              <View style={[styles.levelBadge, { backgroundColor: `${currentLevel.color}20`, borderColor: currentLevel.color }]}>
                <Ionicons name="trophy" size={14} color={currentLevel.color} />
                <Text style={[styles.levelBadgeText, { color: currentLevel.color }]}>
                  {currentLevel.name}
                </Text>
              </View>
              <Text style={[styles.pointsValue, { color: colors.text }]}>{points.toLocaleString()}</Text>
            </View>
            <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>نقطة مجموعة</Text>

            {nextLevel && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressNextLevel}>
                    المستوى التالي: {nextLevel.name}
                  </Text>
                  <Text style={styles.progressRemaining}>
                    {(nextLevel.min - points).toLocaleString()} نقطة متبقية
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(progressInLevel, 100)}%`, backgroundColor: currentLevel.color },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.levelsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>المستويات</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {LEVELS.map((level) => (
              <View
                key={level.name}
                style={[
                  styles.levelPill,
                  currentLevel.name === level.name && { borderColor: level.color, backgroundColor: `${level.color}15` },
                ]}
              >
                <View style={[styles.levelDot, { backgroundColor: level.color }]} />
                <Text style={[styles.levelPillText, currentLevel.name === level.name && { color: level.color }]}>
                  {level.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.rewardsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>المكافآت المتاحة</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>استبدل نقاطك بمكافآت حصرية من شركاء نطق</Text>

          <View style={styles.rewardsGrid}>
            {REWARDS.map((reward) => {
              const canRedeem = points >= reward.points;
              const isRedeemed = redeemedRewards.includes(reward.id);

              return (
                <Pressable
                  key={reward.id}
                  onPress={() => !isRedeemed && handleRedeem(reward)}
                  style={({ pressed }) => [
                    styles.rewardCard,
                    { backgroundColor: cardBg },
                    isRedeemed && styles.rewardCardRedeemed,
                    pressed && canRedeem && { opacity: 0.85 },
                  ]}
                >
                  <LinearGradient
                    colors={[`${reward.color}12`, `${reward.color}05`]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={[styles.rewardCardBorder, { borderColor: isRedeemed ? Colors.success : `${reward.color}30` }]}>
                    <View style={styles.rewardTop}>
                      <View style={[styles.rewardIconBg, { backgroundColor: `${reward.color}20` }]}>
                        <Ionicons name={reward.icon as any} size={22} color={reward.color} />
                      </View>
                      <View style={[styles.categoryTag, { backgroundColor: `${reward.color}15` }]}>
                        <Text style={[styles.categoryText, { color: reward.color }]}>{reward.category}</Text>
                      </View>
                    </View>

                    <Text style={[styles.rewardName, { color: colors.text }]}>{reward.name}</Text>
                    <Text style={[styles.rewardDesc, { color: colors.textSecondary }]}>{reward.description}</Text>

                    <View style={styles.rewardFooter}>
                      <Pressable
                        onPress={() => !isRedeemed && handleRedeem(reward)}
                        style={[
                          styles.redeemBtn,
                          !canRedeem && !isRedeemed && styles.redeemBtnDisabled,
                          isRedeemed && styles.redeemBtnDone,
                        ]}
                      >
                        {isRedeemed ? (
                          <>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.redeemBtnText}>تم الاستبدال</Text>
                          </>
                        ) : canRedeem ? (
                          <Text style={styles.redeemBtnText}>استبدل الآن</Text>
                        ) : (
                          <Text style={[styles.redeemBtnText, { color: Colors.textMuted }]}>
                            غير كافٍ
                          </Text>
                        )}
                      </Pressable>
                      <View style={styles.pointsCost}>
                        <Ionicons name="star" size={12} color={Colors.gold} />
                        <Text style={styles.pointsCostText}>{reward.points}</Text>
                      </View>
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

const canContinue = true;

const styles = StyleSheet.create({
  pageHeader: { gap: 4, paddingTop: 8 },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  pointsCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  pointsCardBorder: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  pointsTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  levelBadgeText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
  },
  pointsValue: {
    fontSize: 40,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
  },
  pointsLabel: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "left",
  },
  progressSection: { gap: 8, marginTop: 4 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressNextLevel: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.text,
  },
  progressRemaining: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  levelsSection: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
    marginTop: -8,
  },
  levelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelPillText: {
    fontSize: 13,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.textSecondary,
  },
  rewardsSection: { gap: 10 },
  rewardsGrid: { gap: 12 },
  rewardCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  rewardCardRedeemed: { opacity: 0.8 },
  rewardCardBorder: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  rewardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rewardIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  categoryText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  rewardName: {
    fontSize: 18,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  rewardDesc: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  rewardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  redeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  redeemBtnDisabled: { backgroundColor: Colors.backgroundSecondary },
  redeemBtnDone: { backgroundColor: Colors.success },
  redeemBtnText: {
    fontSize: 13,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  pointsCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pointsCostText: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    color: Colors.gold,
  },
});
