import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { SaudiAvatar } from "@/components/Avatar";

const { width } = Dimensions.get("window");

const STAGES = [
  {
    id: 1,
    title: "المحادثة الأولى",
    titleEn: "First Chat",
    description: "تعلم أساسيات التواصل",
    lessons: 3,
    xp: 50,
    icon: "chatbubbles-outline",
  },
  {
    id: 2,
    title: "الأسئلة والأجوبة",
    titleEn: "Q&A",
    description: "مهارات الاستفسار",
    lessons: 4,
    xp: 75,
    icon: "help-circle-outline",
  },
  {
    id: 3,
    title: "تقديم النفس",
    titleEn: "Intro",
    description: "كيف تقدم نفسك باحتراف",
    lessons: 3,
    xp: 60,
    icon: "person-outline",
  },
  {
    id: 4,
    title: "الجمل المركبة",
    titleEn: "Complex Sentences",
    description: "بناء جمل متقدمة",
    lessons: 5,
    xp: 100,
    icon: "text-outline",
  },
  {
    id: 5,
    title: "المقابلة الوظيفية",
    titleEn: "Job Interview",
    description: "حضّر نفسك للمقابلات",
    lessons: 6,
    xp: 150,
    icon: "briefcase-outline",
  },
  {
    id: 6,
    title: "النقاش والإقناع",
    titleEn: "Debate",
    description: "فن الحجة والإقناع",
    lessons: 5,
    xp: 120,
    icon: "mic-outline",
  },
  {
    id: 7,
    title: "الذكاء الاصطناعي",
    titleEn: "AI Talk",
    description: "التحدث عن التقنية",
    lessons: 4,
    xp: 100,
    icon: "hardware-chip-outline",
  },
  {
    id: 8,
    title: "الخطابة والعرض",
    titleEn: "Public Speaking",
    description: "مهارات العرض والتقديم",
    lessons: 6,
    xp: 150,
    icon: "podium-outline",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, streak, completedStages, completeStage } = useApp();
  const [activeStage, setActiveStage] = useState<typeof STAGES[0] | null>(null);
  const [stageLoading, setStageLoading] = useState(false);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const unlockedUpTo = completedStages.length + 1;

  async function handleStagePress(stage: typeof STAGES[0]) {
    if (stage.id > unlockedUpTo) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveStage(stage);
  }

  async function handleCompleteStage() {
    if (!activeStage) return;
    setStageLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 1500));
    await completeStage(activeStage.id);
    setStageLoading(false);
    setActiveStage(null);
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topInset,
          paddingBottom: 120,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.menuBtn}>
              <Ionicons name="ellipsis-horizontal" size={22} color={Colors.text} />
            </Pressable>
            <View style={styles.headerRight}>
              <Text style={styles.greeting}>مرحباً،</Text>
              <Text style={styles.userName}>{profile.name}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatBadge
              icon="flame"
              value={String(streak)}
              label="يوم"
              color="#F97316"
              glowColor="#F97316"
            />
            <StatBadge
              icon="star"
              value={String(points)}
              label="نقطة"
              color={Colors.gold}
              glowColor={Colors.gold}
            />
            <StatBadge
              icon="trophy"
              value={String(completedStages.length)}
              label="مرحلة"
              color={Colors.purple}
              glowColor={Colors.purple}
            />
          </View>
        </View>

        <View style={styles.pathContainer}>
          <Text style={styles.pathTitle}>مسار التعلم</Text>
          <Text style={styles.pathSubtitle}>
            {completedStages.length} من {STAGES.length} مرحلة مكتملة
          </Text>

          <View style={styles.path}>
            {STAGES.map((stage, index) => {
              const isCompleted = completedStages.includes(stage.id);
              const isUnlocked = stage.id <= unlockedUpTo;
              const isActive = stage.id === unlockedUpTo;
              const isLeft = index % 2 === 0;

              return (
                <StageNode
                  key={stage.id}
                  stage={stage}
                  isCompleted={isCompleted}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  isLeft={isLeft}
                  onPress={() => handleStagePress(stage)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {activeStage && (
        <Modal
          animationType="slide"
          transparent
          visible={!!activeStage}
          onRequestClose={() => setActiveStage(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={[Colors.backgroundCard, Colors.backgroundSecondary]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.modalHandle} />

              <View style={styles.modalAvatarSection}>
                <SaudiAvatar size={100} speaking={stageLoading} />
              </View>

              <Text style={styles.modalTitle}>{activeStage.title}</Text>
              <Text style={styles.modalDesc}>{activeStage.description}</Text>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Ionicons name="book-outline" size={18} color={Colors.blueLight} />
                  <Text style={styles.modalStatText}>{activeStage.lessons} دروس</Text>
                </View>
                <View style={styles.modalStatDivider} />
                <View style={styles.modalStatItem}>
                  <Ionicons name="star" size={18} color={Colors.gold} />
                  <Text style={styles.modalStatText}>{activeStage.xp} نقطة</Text>
                </View>
              </View>

              <Pressable
                onPress={handleCompleteStage}
                disabled={stageLoading || completedStages.includes(activeStage.id)}
                style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
              >
                <LinearGradient
                  colors={
                    completedStages.includes(activeStage.id)
                      ? [Colors.success, Colors.success]
                      : [Colors.blue, Colors.purple]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startBtnGrad}
                >
                  {stageLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : completedStages.includes(activeStage.id) ? (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.startBtnText}>مكتملة</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="play" size={20} color="#fff" />
                      <Text style={styles.startBtnText}>ابدأ المرحلة</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => setActiveStage(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>إغلاق</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </GridBackground>
  );
}

function StatBadge({ icon, value, label, color, glowColor }: {
  icon: any; value: string; label: string; color: string; glowColor: string;
}) {
  return (
    <View style={[styles.statBadge, { borderColor: `${glowColor}30` }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StageNode({ stage, isCompleted, isUnlocked, isActive, isLeft, onPress }: {
  stage: typeof STAGES[0];
  isCompleted: boolean;
  isUnlocked: boolean;
  isActive: boolean;
  isLeft: boolean;
  onPress: () => void;
}) {
  const pulseAnim = useSharedValue(isActive ? 1 : 1);

  React.useEffect(() => {
    if (isActive) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 300 });
    }
  }, [isActive]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const nodeColor = isCompleted
    ? Colors.blue
    : isActive
    ? Colors.purple
    : Colors.backgroundCard;

  const borderColor = isCompleted
    ? Colors.blue
    : isActive
    ? Colors.purple
    : Colors.border;

  return (
    <View style={[styles.stageRow, isLeft ? styles.stageLeft : styles.stageRight]}>
      <View style={[styles.stageContent, isLeft ? { alignItems: "flex-start" } : { alignItems: "flex-end" }]}>
        <Text style={[styles.stageTitleSmall, !isUnlocked && styles.stageTitleLocked]}>
          {stage.title}
        </Text>
        <Text style={styles.stageXp}>+{stage.xp} نقطة</Text>
      </View>

      <Animated.View style={nodeStyle}>
        <Pressable
          onPress={onPress}
          style={[
            styles.stageNode,
            { backgroundColor: isCompleted ? Colors.blue : Colors.backgroundCard },
            { borderColor },
            isActive && styles.stageNodeActive,
          ]}
        >
          {isActive && (
            <View style={[StyleSheet.absoluteFill, styles.stageGlow]}>
              <LinearGradient
                colors={[`${Colors.purple}40`, "transparent"]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          {isCompleted ? (
            <Ionicons name="checkmark" size={28} color="#fff" />
          ) : isUnlocked ? (
            <Ionicons name={stage.icon as any} size={26} color={isActive ? Colors.purpleLight : Colors.textSecondary} />
          ) : (
            <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
          )}
        </Pressable>
      </Animated.View>

      {isActive && (
        <View style={[styles.activeBadge, isLeft ? styles.activeBadgeRight : styles.activeBadgeLeft]}>
          <LinearGradient
            colors={[Colors.blue, Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activeBadgeGrad}
          >
            <Text style={styles.activeBadgeText}>الحالية</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: { alignItems: "flex-end" },
  greeting: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
  },
  menuBtn: {
    width: 44,
    height: 44,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Cairo_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  pathContainer: {
    paddingHorizontal: 20,
    gap: 4,
  },
  pathTitle: {
    fontSize: 20,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  pathSubtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
    marginBottom: 16,
  },
  path: {
    gap: 0,
    alignItems: "center",
  },
  stageRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    gap: 12,
    paddingHorizontal: 16,
  },
  stageLeft: { flexDirection: "row-reverse" },
  stageRight: { flexDirection: "row" },
  stageContent: { flex: 1, gap: 2 },
  stageTitleSmall: {
    fontSize: 14,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
  },
  stageTitleLocked: { color: Colors.textMuted },
  stageXp: {
    fontSize: 12,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
  stageNode: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  stageNodeActive: {
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  stageGlow: {
    borderRadius: 36,
  },
  activeBadge: {
    position: "absolute",
    top: -8,
  },
  activeBadgeLeft: { left: 16 },
  activeBadgeRight: { right: 16 },
  activeBadgeGrad: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    overflow: "hidden",
    alignItems: "center",
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  modalAvatarSection: {
    marginVertical: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    marginVertical: 4,
  },
  modalStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  modalStatText: {
    fontSize: 14,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.text,
  },
  startBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  startBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: "Cairo_700Bold",
    color: "#fff",
  },
  closeBtn: {
    paddingVertical: 12,
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
  },
});
