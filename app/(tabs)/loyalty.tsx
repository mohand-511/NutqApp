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
    nameAr: "جرير",       nameEn: "Jarir",
    descAr: "قسيمة خصم 50 ريال",  descEn: "SAR 50 discount voucher",
    catAr: "تسوق",         catEn: "Shopping",
    points: 500, color: "#1D4ED8", icon: "book-outline",
  },
  {
    id: "stc",
    nameAr: "STC",         nameEn: "STC",
    descAr: "باقة إنترنت 5GB",     descEn: "5 GB internet bundle",
    catAr: "اتصالات",     catEn: "Telecom",
    points: 300, color: "#7C3AED", icon: "wifi-outline",
  },
  {
    id: "albaik",
    nameAr: "البيك",       nameEn: "AlBaik",
    descAr: "وجبة مجانية",         descEn: "Free meal",
    catAr: "طعام",         catEn: "Food",
    points: 200, color: "#DC2626", icon: "fast-food-outline",
  },
  {
    id: "extra",
    nameAr: "إكسترا",     nameEn: "Extra",
    descAr: "خصم 100 ريال على الإلكترونيات", descEn: "SAR 100 off electronics",
    catAr: "إلكترونيات",  catEn: "Electronics",
    points: 800, color: "#059669", icon: "phone-portrait-outline",
  },
  {
    id: "flynas",
    nameAr: "فلاي ناس",   nameEn: "Flynas",
    descAr: "تخفيض 200 ريال على الرحلات", descEn: "SAR 200 off flights",
    catAr: "سفر",          catEn: "Travel",
    points: 1000, color: "#D97706", icon: "airplane-outline",
  },
  {
    id: "starbucks",
    nameAr: "ستاربكس",    nameEn: "Starbucks",
    descAr: "مشروب مجاني",         descEn: "Free drink",
    catAr: "مقاهي",       catEn: "Cafés",
    points: 150, color: "#065F46", icon: "cafe-outline",
  },
];

const LEVELS = [
  { nameAr: "برونزي", nameEn: "Bronze",   min: 0,    max: 499,      color: "#CD7F32" },
  { nameAr: "فضي",   nameEn: "Silver",   min: 500,   max: 999,      color: "#9CA3AF" },
  { nameAr: "ذهبي",  nameEn: "Gold",     min: 1000,  max: 2499,     color: "#F59E0B" },
  { nameAr: "بلاتيني",nameEn: "Platinum",min: 2500,  max: 4999,     color: "#38BDF8" },
  { nameAr: "الماسي",nameEn: "Diamond",  min: 5000,  max: Infinity, color: "#A78BFA" },
];

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { points, language } = useApp();
  const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);

  const isRTL = language === "ar";
  const t = (ar: string, en: string) => isRTL ? ar : en;

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const currentLevel = LEVELS.find((l) => points >= l.min && points <= l.max) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.findIndex((l) => l === currentLevel) + 1];
  const progressInLevel = nextLevel
    ? ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  const cardBg       = isDark ? "rgba(255,255,255,0.05)" : "#ffffff";
  const pillBg       = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)";
  const pillBorder   = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const progressTrack= isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const disabledBg   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const disabledText = isDark ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.3)";

  async function handleRedeem(reward: (typeof REWARDS)[0]) {
    if (points < reward.points) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRedeemedRewards((prev) => [...prev, reward.id]);
    const name = isRTL ? reward.nameAr : reward.nameEn;
    const desc = isRTL ? reward.descAr : reward.descEn;
    Alert.alert(
      t("تم الاستبدال!", "Redeemed!"),
      t(
        `تم استبدال ${reward.points} نقطة بـ${desc} من ${name}`,
        `You redeemed ${reward.points} points for ${desc} from ${name}`
      ),
      [{ text: t("رائع!", "Awesome!"), style: "default" }]
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
          <Text style={[s.pageTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {t("نقاطي", "My Points")}
          </Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {t("اجمع نقاطاً واستبدلها بمكافآت حصرية", "Earn points and redeem exclusive rewards")}
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
            <View style={{ flexDirection: isRTL ? "row" : "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
              <View style={[s.levelBadge, { backgroundColor: `${currentLevel.color}20`, borderColor: currentLevel.color }]}>
                <Ionicons name="trophy" size={14} color={currentLevel.color} />
                <Text style={[s.levelBadgeText, { color: currentLevel.color }]}>
                  {isRTL ? currentLevel.nameAr : currentLevel.nameEn}
                </Text>
              </View>
              <Text style={[s.pointsValue, { color: colors.text }]}>{points.toLocaleString()}</Text>
            </View>
            <Text style={[s.pointsLabel, { color: colors.textSecondary, textAlign: isRTL ? "left" : "right" }]}>
              {t("نقطة مجموعة", "points earned")}
            </Text>

            {nextLevel && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <View style={{ flexDirection: isRTL ? "row" : "row-reverse", justifyContent: "space-between" }}>
                  <Text style={[s.progressText, { color: colors.text }]}>
                    {t("المستوى التالي:", "Next level:")} {isRTL ? nextLevel.nameAr : nextLevel.nameEn}
                  </Text>
                  <Text style={[s.progressText, { color: colors.textSecondary }]}>
                    {(nextLevel.min - points).toLocaleString()} {t("نقطة متبقية", "pts to go")}
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
          <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {t("المستويات", "Levels")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {LEVELS.map((level) => {
              const active = currentLevel.nameAr === level.nameAr;
              return (
                <View
                  key={level.nameEn}
                  style={[
                    s.levelPill,
                    { backgroundColor: active ? `${level.color}18` : pillBg, borderColor: active ? level.color : pillBorder },
                  ]}
                >
                  <View style={[s.levelDot, { backgroundColor: level.color }]} />
                  <Text style={[s.levelPillText, { color: active ? level.color : colors.textSecondary }]}>
                    {isRTL ? level.nameAr : level.nameEn}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Rewards */}
        <View style={{ gap: 10 }}>
          <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
            {t("المكافآت المتاحة", "Available Rewards")}
          </Text>
          <Text style={[s.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {t("استبدل نقاطك بمكافآت حصرية من شركاء نطق", "Redeem your points for exclusive rewards from Nutq partners")}
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

                  <View style={{ flexDirection: isRTL ? "row" : "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={[s.rewardIconBg, { backgroundColor: `${reward.color}18` }]}>
                      <Ionicons name={reward.icon as any} size={22} color={reward.color} />
                    </View>
                    <View style={[s.categoryTag, { backgroundColor: `${reward.color}15` }]}>
                      <Text style={[s.categoryText, { color: reward.color }]}>
                        {isRTL ? reward.catAr : reward.catEn}
                      </Text>
                    </View>
                  </View>

                  <Text style={[s.rewardName, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}>
                    {isRTL ? reward.nameAr : reward.nameEn}
                  </Text>
                  <Text style={[s.rewardDesc, { color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
                    {isRTL ? reward.descAr : reward.descEn}
                  </Text>

                  <View style={[s.rewardFooter, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                    <Pressable
                      onPress={() => !isRedeemed && handleRedeem(reward)}
                      style={[
                        s.redeemBtn,
                        isRedeemed
                          ? { backgroundColor: "#10B981" }
                          : canRedeem
                          ? { backgroundColor: reward.color }
                          : { backgroundColor: disabledBg, borderWidth: 1, borderColor: pillBorder },
                      ]}
                    >
                      {isRedeemed ? (
                        <>
                          <Ionicons name="checkmark-circle" size={14} color="#fff" />
                          <Text style={[s.redeemBtnText, { color: "#fff" }]}>{t("تم الاستبدال", "Redeemed")}</Text>
                        </>
                      ) : canRedeem ? (
                        <Text style={[s.redeemBtnText, { color: "#fff" }]}>{t("استبدل الآن", "Redeem Now")}</Text>
                      ) : (
                        <Text style={[s.redeemBtnText, { color: disabledText }]}>{t("غير كافٍ", "Not enough")}</Text>
                      )}
                    </Pressable>

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
  pageTitle:    { fontSize: 28, fontFamily: "Cairo_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Cairo_400Regular" },

  pointsCardInner: { borderWidth: 1.5, borderRadius: 22, padding: 20, gap: 8 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
  levelBadgeText: { fontSize: 13, fontFamily: "Cairo_700Bold" },
  pointsValue: { fontSize: 42, fontFamily: "Cairo_700Bold" },
  pointsLabel: { fontSize: 13, fontFamily: "Cairo_400Regular" },
  progressText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  progressBar: { height: 7, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },

  sectionTitle:    { fontSize: 18, fontFamily: "Cairo_700Bold" },
  sectionSubtitle: { fontSize: 13, fontFamily: "Cairo_400Regular", marginTop: -4 },

  levelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5 },
  levelDot:  { width: 8, height: 8, borderRadius: 4 },
  levelPillText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },

  rewardCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5, padding: 16, gap: 8 },
  rewardIconBg: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  categoryText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
  rewardName: { fontSize: 18, fontFamily: "Cairo_700Bold" },
  rewardDesc: { fontSize: 13, fontFamily: "Cairo_400Regular" },

  rewardFooter: { alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  redeemBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  redeemBtnText: { fontSize: 13, fontFamily: "Cairo_700Bold" },

  pointsCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  pointsCostText: { fontSize: 15, fontFamily: "Cairo_700Bold" },
});
