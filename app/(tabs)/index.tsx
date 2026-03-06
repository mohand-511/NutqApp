import React, { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/query-client";

const { width } = Dimensions.get("window");

const STAGES = [
  {
    id: 1,
    title: "المحادثة الأولى",
    description: "تعلم أساسيات التواصل اليومي",
    icon: "chatbubbles-outline",
    xp: 50,
    lessons: 3,
    skills: ["التحية", "التعريف بالنفس", "الأسئلة الأساسية"],
    duration: "10 دقائق",
    tips: "ركز على التحدث بثقة، الأخطاء جزء من التعلم!",
  },
  {
    id: 2,
    title: "الأسئلة والأجوبة",
    description: "مهارات الاستفسار والرد",
    icon: "help-circle-outline",
    xp: 75,
    lessons: 4,
    skills: ["صياغة الأسئلة", "الردود المناسبة", "لغة الجسد"],
    duration: "15 دقائق",
    tips: "اسأل أسئلة مفتوحة لتحفيز المحادثة",
  },
  {
    id: 3,
    title: "تقديم النفس",
    description: "كيف تقدم نفسك باحتراف",
    icon: "person-outline",
    xp: 60,
    lessons: 3,
    skills: ["المقدمة الشخصية", "ذكر الاهتمامات", "الانطباع الأول"],
    duration: "12 دقيقة",
    tips: "ابتسم وحافظ على التواصل البصري",
  },
  {
    id: 4,
    title: "الجمل المركبة",
    description: "بناء جمل أكثر تعقيداً ودقة",
    icon: "text-outline",
    xp: 100,
    lessons: 5,
    skills: ["روابط الجمل", "التعبير عن الرأي", "الصفات والأوصاف"],
    duration: "20 دقيقة",
    tips: "استخدم روابط مثل: لأن، لذلك، ومع ذلك",
  },
  {
    id: 5,
    title: "المقابلة الوظيفية",
    description: "حضّر نفسك للمقابلات المهنية",
    icon: "briefcase-outline",
    xp: 150,
    lessons: 6,
    skills: ["STAR Method", "نقاط القوة والضعف", "الأسئلة الصعبة"],
    duration: "30 دقيقة",
    tips: "استعد بأمثلة حقيقية من تجاربك",
  },
  {
    id: 6,
    title: "النقاش والإقناع",
    description: "فن الحجة والإقناع المؤثر",
    icon: "mic-outline",
    xp: 120,
    lessons: 5,
    skills: ["بناء الحجج", "الرد على الاعتراضات", "لغة الإقناع"],
    duration: "25 دقيقة",
    tips: "استمع جيداً قبل أن ترد لفهم وجهة النظر الأخرى",
  },
  {
    id: 7,
    title: "الذكاء الاصطناعي",
    description: "التحدث عن التقنية والمستقبل",
    icon: "hardware-chip-outline",
    xp: 100,
    lessons: 4,
    skills: ["مصطلحات التقنية", "نقاش المستقبل", "الآراء التقنية"],
    duration: "20 دقيقة",
    tips: "لا تخف من التعبير عن رأيك في التقنية",
  },
  {
    id: 8,
    title: "الخطابة والعرض",
    description: "مهارات العرض والتقديم أمام الجمهور",
    icon: "podium-outline",
    xp: 150,
    lessons: 6,
    skills: ["بنية العرض", "لغة الجسد", "إدارة التوتر"],
    duration: "35 دقيقة",
    tips: "تدرب أمام المرآة أو سجّل نفسك لتحسين أدائك",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, streak, completedStages, completeStage } = useApp();
  const [activeStage, setActiveStage] = useState<typeof STAGES[0] | null>(null);
  const [stageLoading, setStageLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [wordOfDay, setWordOfDay] = useState<{ word: string; translation: string; pronunciation: string; example: string; tip: string } | null>(null);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const unlockedUpTo = completedStages.length + 1;

  useEffect(() => {
    fetchWordOfDay();
  }, []);

  async function fetchWordOfDay() {
    try {
      const res = await apiRequest("GET", "/api/word-of-day");
      const data = await res.json();
      setWordOfDay(data);
    } catch {}
  }

  async function handleStagePress(stage: typeof STAGES[0]) {
    if (stage.id > unlockedUpTo) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveStage(stage);
    setAiHint("");

    setHintLoading(true);
    try {
      const res = await apiRequest("POST", "/api/stage-hint", {
        stageId: stage.id,
        stageName: stage.title,
        userLevel: profile.level,
      });
      const data = await res.json();
      setAiHint(data.hint || "");
    } catch {}
    setHintLoading(false);
  }

  async function handleCompleteStage() {
    if (!activeStage) return;
    setStageLoading(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 1200));
    await completeStage(activeStage.id);
    setStageLoading(false);
    setActiveStage(null);
  }

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topInset, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.menuBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text} />
            </Pressable>
            <View style={styles.headerRight}>
              <Text style={styles.greeting}>مرحباً،</Text>
              <Text style={styles.userName} numberOfLines={1}>{profile.name}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatBadge icon="flame" value={String(streak)} label="يوم" color="#F97316" />
            <StatBadge icon="star" value={String(points)} label="نقطة" color={Colors.gold} />
            <StatBadge icon="trophy" value={String(completedStages.length)} label="مرحلة" color={Colors.purple} />
          </View>
        </View>

        {wordOfDay && (
          <View style={styles.wordCard}>
            <LinearGradient
              colors={[`${Colors.blue}18`, `${Colors.purple}10`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.wordCardInner]}>
              <View style={styles.wordCardHeader}>
                <View style={styles.wordBadge}>
                  <Ionicons name="bulb-outline" size={13} color={Colors.gold} />
                  <Text style={styles.wordBadgeText}>كلمة اليوم</Text>
                </View>
                <Text style={styles.wordPronounce}>{wordOfDay.pronunciation}</Text>
              </View>
              <Text style={styles.wordMain}>{wordOfDay.word}</Text>
              <Text style={styles.wordTranslation}>{wordOfDay.translation}</Text>
              <View style={styles.wordDivider} />
              <Text style={styles.wordExample}>{wordOfDay.example}</Text>
              <View style={styles.wordTipRow}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.blueLight} />
                <Text style={styles.wordTip}>{wordOfDay.tip}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.pathSection}>
          <View style={styles.pathHeader}>
            <Text style={styles.pathSubtitle}>
              {completedStages.length} من {STAGES.length} مرحلة
            </Text>
            <Text style={styles.pathTitle}>مسار التعلم</Text>
          </View>

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

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <View style={styles.modalAvatarSection}>
                  <SaudiAvatar size={90} speaking={stageLoading} />
                </View>

                <Text style={styles.modalTitle}>{activeStage.title}</Text>
                <Text style={styles.modalDesc}>{activeStage.description}</Text>

                <View style={styles.modalMeta}>
                  <MetaItem icon="time-outline" value={activeStage.duration} color={Colors.blueLight} />
                  <MetaItem icon="book-outline" value={`${activeStage.lessons} دروس`} color={Colors.purple} />
                  <MetaItem icon="star" value={`${activeStage.xp} XP`} color={Colors.gold} />
                </View>

                <View style={styles.skillsSection}>
                  <Text style={styles.skillsTitle}>المهارات المكتسبة</Text>
                  <View style={styles.skillsGrid}>
                    {activeStage.skills.map((skill, i) => (
                      <View key={i} style={styles.skillChip}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} />
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.tipsSection}>
                  <View style={styles.tipHeader}>
                    <Ionicons name="flash-outline" size={15} color={Colors.gold} />
                    <Text style={styles.tipsTitle}>نصيحة ذهبية</Text>
                  </View>
                  <Text style={styles.tipText}>{activeStage.tips}</Text>
                </View>

                {(aiHint || hintLoading) && (
                  <View style={styles.aiHintSection}>
                    <LinearGradient
                      colors={[`${Colors.blue}15`, `${Colors.purple}10`]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.aiHintInner}>
                      <View style={styles.aiHintHeader}>
                        <View style={styles.aiBadge}>
                          <Ionicons name="hardware-chip-outline" size={13} color={Colors.blueLight} />
                          <Text style={styles.aiBadgeText}>نطق AI</Text>
                        </View>
                      </View>
                      {hintLoading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <ActivityIndicator size="small" color={Colors.blue} />
                          <Text style={styles.aiHintLoading}>يفكر نطق AI...</Text>
                        </View>
                      ) : (
                        <Text style={styles.aiHintText}>{aiHint}</Text>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={handleCompleteStage}
                    disabled={stageLoading || completedStages.includes(activeStage.id)}
                    style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
                  >
                    <LinearGradient
                      colors={completedStages.includes(activeStage.id) ? [Colors.success, Colors.success] : [Colors.blue, Colors.purple]}
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </GridBackground>
  );
}

function MetaItem({ icon, value, color }: { icon: any; value: string; color: string }) {
  return (
    <View style={[styles.metaItem, { borderColor: `${color}30` }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.metaValue, { color }]}>{value}</Text>
    </View>
  );
}

function StatBadge({ icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statBadge, { borderColor: `${color}25` }]}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StageNode({ stage, isCompleted, isUnlocked, isActive, isLeft, onPress }: {
  stage: typeof STAGES[0]; isCompleted: boolean; isUnlocked: boolean; isActive: boolean; isLeft: boolean; onPress: () => void;
}) {
  const pulse = useSharedValue(1);
  const glowOpacity = useSharedValue(isActive ? 0.5 : 0);

  React.useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 1200 }), withTiming(0.3, { duration: 1200 })),
        -1,
        true
      );
    }
  }, [isActive]);

  const nodeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <View style={[styles.stageRow, isLeft ? styles.rowLeft : styles.rowRight]}>
      <View style={[styles.stageInfo, isLeft ? { alignItems: "flex-start" } : { alignItems: "flex-end" }]}>
        <Text style={[styles.stageTitle, !isUnlocked && { color: Colors.textMuted }]} numberOfLines={1}>
          {stage.title}
        </Text>
        <View style={[styles.stageMeta, isLeft ? {} : { flexDirection: "row-reverse" }]}>
          <Ionicons name="star" size={11} color={isUnlocked ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.stageXp, !isUnlocked && { color: Colors.textMuted }]}>+{stage.xp}</Text>
          <Text style={[styles.stageDuration, !isUnlocked && { color: Colors.textMuted }]}>{stage.duration}</Text>
        </View>
      </View>

      <Animated.View style={nodeAnimStyle}>
        {isActive && (
          <Animated.View style={[styles.stageGlow, glowStyle]}>
            <LinearGradient colors={[Colors.purple, Colors.blue]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        <Pressable
          onPress={onPress}
          style={[
            styles.stageNode,
            isCompleted && { backgroundColor: Colors.blue, borderColor: Colors.blue },
            isActive && { borderColor: Colors.purple, backgroundColor: Colors.backgroundCard },
            !isUnlocked && { borderColor: Colors.border },
          ]}
        >
          {isCompleted ? (
            <Ionicons name="checkmark" size={26} color="#fff" />
          ) : isUnlocked ? (
            <Ionicons
              name={stage.icon as any}
              size={24}
              color={isActive ? Colors.purpleLight : Colors.textSecondary}
            />
          ) : (
            <Ionicons name="lock-closed" size={20} color={Colors.textMuted} />
          )}
        </Pressable>
      </Animated.View>

      {isActive && (
        <View style={[styles.activePill, isLeft ? styles.activePillRight : styles.activePillLeft]}>
          <LinearGradient
            colors={[Colors.blue, Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.activePillGrad}
          >
            <Text style={styles.activePillText}>الحالية</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { alignItems: "flex-end" },
  greeting: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  userName: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text, maxWidth: width * 0.55 },
  menuBtn: {
    width: 44, height: 44, backgroundColor: Colors.backgroundCard, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 8 },
  statBadge: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: Colors.backgroundCard, borderRadius: 12, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 6,
  },
  statValue: { fontSize: 15, fontFamily: "Cairo_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },

  wordCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 18, overflow: "hidden" },
  wordCardInner: { borderWidth: 1.5, borderColor: `${Colors.blue}30`, borderRadius: 18, padding: 16, gap: 6 },
  wordCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: `${Colors.gold}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100,
    borderWidth: 1, borderColor: `${Colors.gold}30`,
  },
  wordBadgeText: { fontSize: 11, fontFamily: "Cairo_700Bold", color: Colors.gold },
  wordPronounce: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textMuted },
  wordMain: { fontSize: 26, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  wordTranslation: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: Colors.blueLight, textAlign: "right" },
  wordDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  wordExample: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right", lineHeight: 20 },
  wordTipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  wordTip: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.blueLight, flex: 1, textAlign: "right" },

  pathSection: { paddingHorizontal: 20 },
  pathHeader: { marginBottom: 20, gap: 2 },
  pathTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  pathSubtitle: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },
  path: { gap: 4, alignItems: "center" },

  stageRow: { width: "100%", flexDirection: "row", alignItems: "center", marginVertical: 10, gap: 12, paddingHorizontal: 8 },
  rowLeft: { flexDirection: "row-reverse" },
  rowRight: {},
  stageInfo: { flex: 1, gap: 4 },
  stageTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", color: Colors.text },
  stageMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  stageXp: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: Colors.gold },
  stageDuration: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  stageNode: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.backgroundCard, borderColor: Colors.border,
    shadowColor: Colors.blue, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0,
  },
  stageGlow: {
    position: "absolute", width: 90, height: 90, borderRadius: 45, left: -11, top: -11, opacity: 0.4,
  },
  activePill: { position: "absolute", top: -10 },
  activePillLeft: { left: 10 },
  activePillRight: { right: 10 },
  activePillGrad: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  activePillText: { fontSize: 10, fontFamily: "Cairo_700Bold", color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.backgroundCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "90%", overflow: "hidden",
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalScroll: { flex: 1 },
  modalAvatarSection: { alignItems: "center", paddingTop: 16 },
  modalTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "center", marginTop: 10, paddingHorizontal: 20 },
  modalDesc: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "center", paddingHorizontal: 24, marginTop: 4, lineHeight: 22 },
  modalMeta: { flexDirection: "row", gap: 8, justifyContent: "center", paddingHorizontal: 20, marginTop: 16, flexWrap: "wrap" },
  metaItem: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, backgroundColor: Colors.backgroundSecondary, borderWidth: 1,
  },
  metaValue: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },

  skillsSection: { paddingHorizontal: 20, marginTop: 20, gap: 10 },
  skillsTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  skillChip: {
    flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: Colors.border,
  },
  skillText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: Colors.text },

  tipsSection: { marginHorizontal: 20, marginTop: 14, padding: 14, backgroundColor: `${Colors.gold}10`, borderRadius: 14, borderWidth: 1, borderColor: `${Colors.gold}25`, gap: 8 },
  tipHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipsTitle: { fontSize: 13, fontFamily: "Cairo_700Bold", color: Colors.gold },
  tipText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right", lineHeight: 20 },

  aiHintSection: { marginHorizontal: 20, marginTop: 12, borderRadius: 14, overflow: "hidden" },
  aiHintInner: { borderWidth: 1, borderColor: `${Colors.blue}30`, borderRadius: 14, padding: 14, gap: 8 },
  aiHintHeader: { flexDirection: "row", alignItems: "center" },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${Colors.blue}15`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: `${Colors.blue}30`,
  },
  aiBadgeText: { fontSize: 11, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
  aiHintLoading: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textMuted },
  aiHintText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.text, textAlign: "right", lineHeight: 22 },

  modalActions: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 10 },
  startBtn: { borderRadius: 16, overflow: "hidden", shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  startBtnGrad: { paddingVertical: 17, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, borderRadius: 16 },
  startBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  closeBtn: { paddingVertical: 12, alignItems: "center" },
  closeBtnText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
});
