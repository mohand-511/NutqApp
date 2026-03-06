import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
  Dimensions,
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
  { id: 1, title: "المحادثة الأولى", desc: "أساسيات التواصل اليومي", icon: "chatbubbles-outline", xp: 50, lessons: 3, duration: "10 دقائق", skills: ["التحية", "التعريف بالنفس", "الأسئلة الأساسية"], tip: "ركز على التحدث بثقة، الأخطاء جزء من التعلم!" },
  { id: 2, title: "الأسئلة والأجوبة", desc: "مهارات الاستفسار والرد", icon: "help-circle-outline", xp: 75, lessons: 4, duration: "15 دقيقة", skills: ["صياغة الأسئلة", "الردود المناسبة", "لغة الجسد"], tip: "اسأل أسئلة مفتوحة لتحفيز المحادثة" },
  { id: 3, title: "تقديم النفس", desc: "كيف تُقدم نفسك باحتراف", icon: "person-outline", xp: 60, lessons: 3, duration: "12 دقيقة", skills: ["المقدمة الشخصية", "ذكر الاهتمامات", "الانطباع الأول"], tip: "ابتسم وحافظ على التواصل البصري" },
  { id: 4, title: "الجمل المركبة", desc: "بناء جمل أكثر تعقيداً ودقة", icon: "text-outline", xp: 100, lessons: 5, duration: "20 دقيقة", skills: ["روابط الجمل", "التعبير عن الرأي", "الصفات والأوصاف"], tip: "استخدم روابط مثل: لأن، لذلك، ومع ذلك" },
  { id: 5, title: "المقابلة الوظيفية", desc: "حضّر نفسك للمقابلات المهنية", icon: "briefcase-outline", xp: 150, lessons: 6, duration: "30 دقيقة", skills: ["STAR Method", "نقاط القوة والضعف", "الأسئلة الصعبة"], tip: "استعد بأمثلة حقيقية من تجاربك" },
  { id: 6, title: "النقاش والإقناع", desc: "فن الحجة والإقناع المؤثر", icon: "mic-outline", xp: 120, lessons: 5, duration: "25 دقيقة", skills: ["بناء الحجج", "الرد على الاعتراضات", "لغة الإقناع"], tip: "استمع جيداً قبل أن ترد" },
  { id: 7, title: "الذكاء الاصطناعي", desc: "التحدث عن التقنية والمستقبل", icon: "hardware-chip-outline", xp: 100, lessons: 4, duration: "20 دقيقة", skills: ["مصطلحات التقنية", "نقاش المستقبل", "الآراء التقنية"], tip: "لا تخف من التعبير عن رأيك في التقنية" },
  { id: 8, title: "الخطابة والعرض", desc: "مهارات التقديم أمام الجمهور", icon: "podium-outline", xp: 150, lessons: 6, duration: "35 دقيقة", skills: ["بنية العرض", "لغة الجسد", "إدارة التوتر"], tip: "تدرب أمام المرآة أو سجّل نفسك" },
];

type Stage = typeof STAGES[0];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, streak, completedStages, completeStage } = useApp();
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageLoading, setStageLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [wordOfDay, setWordOfDay] = useState<{ word: string; translation: string; pronunciation: string; example: string; tip: string } | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const unlockedUpTo = completedStages.length + 1;

  useEffect(() => {
    apiRequest("GET", "/api/word-of-day")
      .then((r) => r.json())
      .then(setWordOfDay)
      .catch(() => {});
  }, []);

  async function openStage(stage: Stage) {
    if (stage.id > unlockedUpTo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveStage(stage);
    setAiHint("");
    setHintLoading(true);
    try {
      const r = await apiRequest("POST", "/api/stage-hint", { stageId: stage.id, stageName: stage.title, userLevel: profile.level });
      const d = await r.json();
      setAiHint(d.hint || "");
    } catch {}
    setHintLoading(false);
  }

  async function finishStage() {
    if (!activeStage) return;
    setStageLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise((r) => setTimeout(r, 1000));
    await completeStage(activeStage.id);
    setStageLoading(false);
    setActiveStage(null);
  }

  const dailyGoal = 3;
  const dailyProgress = Math.min(completedStages.length, dailyGoal);
  const progressPct = dailyProgress / dailyGoal;

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: 120 }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color="#F97316" />
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.appName}>نطق</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color={Colors.gold} />
              <Text style={styles.pointsNum}>{points}</Text>
            </View>
          </View>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>مرحباً، {profile.name} 👋</Text>
          <Text style={styles.greetingSubtext}>استمر في رحلتك اليوم!</Text>
        </View>

        {/* ── Daily Goal ── */}
        <View style={styles.goalCard}>
          <LinearGradient
            colors={[`${Colors.blue}22`, `${Colors.purple}12`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <View style={styles.goalInner}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalPct}>{Math.round(progressPct * 100)}%</Text>
              <View>
                <Text style={styles.goalTitle}>هدف اليوم</Text>
                <Text style={styles.goalSub}>{dailyProgress} من {dailyGoal} مراحل</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.max(4, progressPct * 100)}%` }]}
              />
            </View>
            <View style={styles.goalDots}>
              {Array.from({ length: dailyGoal }).map((_, i) => (
                <View key={i} style={[styles.goalDot, i < dailyProgress && styles.goalDotFilled]} />
              ))}
            </View>
          </View>
        </View>

        {/* ── Word of the Day ── */}
        {wordOfDay && (
          <View style={styles.wordCard}>
            <View style={styles.wordTop}>
              <Text style={styles.wordPronounce}>{wordOfDay.pronunciation}</Text>
              <View style={styles.wordBadge}>
                <Ionicons name="bulb-outline" size={12} color={Colors.gold} />
                <Text style={styles.wordBadgeLabel}>كلمة اليوم</Text>
              </View>
            </View>
            <Text style={styles.wordMain}>{wordOfDay.word}</Text>
            <Text style={styles.wordTr}>{wordOfDay.translation}</Text>
            <View style={styles.wordDivider} />
            <Text style={styles.wordEx} numberOfLines={2}>{wordOfDay.example}</Text>
          </View>
        )}

        {/* ── Learning Path ── */}
        <View style={styles.pathSection}>
          <View style={styles.pathHeaderRow}>
            <Text style={styles.pathProgress}>{completedStages.length}/{STAGES.length}</Text>
            <Text style={styles.pathTitle}>مسار التعلم</Text>
          </View>

          <View style={styles.timeline}>
            {/* The vertical line */}
            <View style={styles.timelineLine}>
              <LinearGradient
                colors={[Colors.blue, Colors.purple, `${Colors.purple}20`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {STAGES.map((stage, index) => {
              const isCompleted = completedStages.includes(stage.id);
              const isUnlocked = stage.id <= unlockedUpTo;
              const isActive = stage.id === unlockedUpTo;
              const isLast = index === STAGES.length - 1;

              return (
                <TimelineRow
                  key={stage.id}
                  stage={stage}
                  isCompleted={isCompleted}
                  isUnlocked={isUnlocked}
                  isActive={isActive}
                  isLast={isLast}
                  onPress={() => openStage(stage)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── Stage Detail Modal ── */}
      {activeStage && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setActiveStage(null)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                {/* Stage Icon + Title */}
                <View style={styles.sheetHero}>
                  <LinearGradient
                    colors={[`${Colors.blue}25`, `${Colors.purple}15`]}
                    style={styles.sheetIconBg}
                  >
                    <Ionicons name={activeStage.icon as any} size={36} color={Colors.blueLight} />
                  </LinearGradient>
                  <Text style={styles.sheetTitle}>{activeStage.title}</Text>
                  <Text style={styles.sheetDesc}>{activeStage.desc}</Text>
                </View>

                {/* Stats row */}
                <View style={styles.sheetStats}>
                  <SheetStat icon="time-outline" label={activeStage.duration} color={Colors.blueLight} />
                  <View style={styles.sheetStatDivider} />
                  <SheetStat icon="book-outline" label={`${activeStage.lessons} دروس`} color={Colors.purple} />
                  <View style={styles.sheetStatDivider} />
                  <SheetStat icon="star" label={`+${activeStage.xp} XP`} color={Colors.gold} />
                </View>

                {/* Skills */}
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetSectionTitle}>المهارات المكتسبة</Text>
                  <View style={styles.skillsWrap}>
                    {activeStage.skills.map((s, i) => (
                      <View key={i} style={styles.skillPill}>
                        <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                        <Text style={styles.skillPillText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Tip */}
                <View style={styles.tipBox}>
                  <Ionicons name="flash" size={16} color={Colors.gold} />
                  <Text style={styles.tipBoxText}>{activeStage.tip}</Text>
                </View>

                {/* AI Hint */}
                {(aiHint || hintLoading) && (
                  <View style={styles.aiBox}>
                    <LinearGradient
                      colors={[`${Colors.blue}18`, `${Colors.purple}10`]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    />
                    <View style={styles.aiBadgeRow}>
                      <View style={styles.aiBadge}>
                        <Ionicons name="hardware-chip-outline" size={12} color={Colors.blueLight} />
                        <Text style={styles.aiBadgeText}>نطق AI</Text>
                      </View>
                    </View>
                    {hintLoading ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <ActivityIndicator size="small" color={Colors.blue} />
                        <Text style={styles.aiLoading}>يفكر...</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiText}>{aiHint}</Text>
                    )}
                  </View>
                )}

                {/* Action */}
                <View style={styles.sheetActions}>
                  <Pressable
                    onPress={completedStages.includes(activeStage.id) ? () => setActiveStage(null) : finishStage}
                    disabled={stageLoading}
                    style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.85 }]}
                  >
                    <LinearGradient
                      colors={completedStages.includes(activeStage.id) ? [Colors.success, "#059669"] : [Colors.blue, Colors.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.mainBtnGrad}
                    >
                      {stageLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : completedStages.includes(activeStage.id) ? (
                        <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.mainBtnText}>مكتملة ✓</Text></>
                      ) : (
                        <><Ionicons name="play-circle" size={20} color="#fff" /><Text style={styles.mainBtnText}>ابدأ المرحلة</Text></>
                      )}
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => setActiveStage(null)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>لاحقاً</Text>
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

function SheetStat({ icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <View style={styles.sheetStatItem}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.sheetStatLabel, { color }]}>{label}</Text>
    </View>
  );
}

function TimelineRow({ stage, isCompleted, isUnlocked, isActive, isLast, onPress }: {
  stage: Stage; isCompleted: boolean; isUnlocked: boolean; isActive: boolean; isLast: boolean; onPress: () => void;
}) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.sin) }), withTiming(0.94, { duration: 800, easing: Easing.inOut(Easing.sin) })),
        -1, true
      );
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0.3, { duration: 1000 })), -1, true);
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const nodeColor = isCompleted ? Colors.blue : isActive ? Colors.purple : Colors.backgroundCard;
  const nodeBorder = isCompleted ? Colors.blue : isActive ? Colors.purple : Colors.cardBorder;

  return (
    <View style={[styles.tlRow, isLast && { marginBottom: 0 }]}>
      {/* Node column */}
      <View style={styles.tlNodeCol}>
        {isActive && (
          <Animated.View style={[styles.tlGlow, glowStyle]}>
            <LinearGradient colors={[Colors.purple, Colors.blue]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        <Animated.View style={pulseStyle}>
          <Pressable
            onPress={onPress}
            style={[styles.tlNode, { backgroundColor: nodeColor, borderColor: nodeBorder }]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={22} color="#fff" />
            ) : isUnlocked ? (
              <Ionicons name={stage.icon as any} size={20} color={isActive ? "#fff" : Colors.textMuted} />
            ) : (
              <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
            )}
          </Pressable>
        </Animated.View>
      </View>

      {/* Info card */}
      <Pressable
        onPress={onPress}
        style={[
          styles.tlCard,
          isCompleted && styles.tlCardCompleted,
          isActive && styles.tlCardActive,
          !isUnlocked && styles.tlCardLocked,
        ]}
      >
        {isActive && (
          <LinearGradient
            colors={[`${Colors.purple}18`, `${Colors.blue}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
        )}
        <View style={styles.tlCardContent}>
          <View style={styles.tlCardTop}>
            {isActive && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>الحالية</Text>
              </View>
            )}
            {isCompleted && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>مكتملة</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tlCardTitle, !isUnlocked && { color: Colors.textMuted }]} numberOfLines={1}>
            {stage.title}
          </Text>
          <Text style={[styles.tlCardDesc, !isUnlocked && { color: Colors.textMuted }]} numberOfLines={1}>
            {stage.desc}
          </Text>
          <View style={styles.tlCardMeta}>
            <View style={styles.tlMetaItem}>
              <Ionicons name="time-outline" size={11} color={isUnlocked ? Colors.textSecondary : Colors.textMuted} />
              <Text style={[styles.tlMetaText, !isUnlocked && { color: Colors.textMuted }]}>{stage.duration}</Text>
            </View>
            <View style={styles.tlMetaDot} />
            <View style={styles.tlMetaItem}>
              <Ionicons name="star" size={11} color={isUnlocked ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.tlXpText, !isUnlocked && { color: Colors.textMuted }]}>+{stage.xp}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 },
  headerLeft: {},
  headerCenter: { alignItems: "center" },
  headerRight: {},
  appName: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text, letterSpacing: 1 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F9731615", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: "#F9731630" },
  streakNum: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#F97316" },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${Colors.gold}15`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: `${Colors.gold}30` },
  pointsNum: { fontSize: 14, fontFamily: "Cairo_700Bold", color: Colors.gold },

  greetingRow: { paddingHorizontal: 20, marginBottom: 18, gap: 2 },
  greetingText: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  greetingSubtext: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },

  goalCard: { marginHorizontal: 20, marginBottom: 18, borderRadius: 20, borderWidth: 1.5, borderColor: `${Colors.blue}25`, overflow: "hidden" },
  goalInner: { padding: 18, gap: 12 },
  goalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  goalSub: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },
  goalPct: { fontSize: 32, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.backgroundCardBorder, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  goalDots: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  goalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.backgroundCardBorder, borderWidth: 1, borderColor: Colors.cardBorder },
  goalDotFilled: { backgroundColor: Colors.blue, borderColor: Colors.blue },

  wordCard: { marginHorizontal: 20, marginBottom: 18, padding: 16, borderRadius: 18, backgroundColor: Colors.backgroundCard, borderWidth: 1.5, borderColor: Colors.cardBorder, gap: 6 },
  wordTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${Colors.gold}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: `${Colors.gold}25` },
  wordBadgeLabel: { fontSize: 11, fontFamily: "Cairo_700Bold", color: Colors.gold },
  wordPronounce: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textMuted },
  wordMain: { fontSize: 28, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  wordTr: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: Colors.blueLight, textAlign: "right" },
  wordDivider: { height: 1, backgroundColor: Colors.border },
  wordEx: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right", lineHeight: 20 },

  pathSection: { paddingHorizontal: 20 },
  pathHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  pathTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: Colors.text },
  pathProgress: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: Colors.textSecondary, backgroundColor: Colors.backgroundCard, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: Colors.cardBorder },

  timeline: { position: "relative", gap: 0 },
  timelineLine: { position: "absolute", left: 28, top: 28, bottom: 28, width: 2, overflow: "hidden" },

  tlRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  tlNodeCol: { width: 58, alignItems: "center", justifyContent: "center", position: "relative" },
  tlGlow: { position: "absolute", width: 72, height: 72, borderRadius: 36, left: -7, top: -7, opacity: 0.4 },
  tlNode: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: "center", justifyContent: "center" },

  tlCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.cardBorder, backgroundColor: Colors.backgroundCard, overflow: "hidden" },
  tlCardCompleted: { borderColor: `${Colors.blue}40` },
  tlCardActive: { borderColor: `${Colors.purple}60` },
  tlCardLocked: { opacity: 0.5 },
  tlCardContent: { padding: 14, gap: 4 },
  tlCardTop: { flexDirection: "row", justifyContent: "flex-end", minHeight: 20 },
  currentBadge: { backgroundColor: `${Colors.purple}20`, borderWidth: 1, borderColor: `${Colors.purple}50`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  currentBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold", color: Colors.purpleLight },
  doneBadge: { backgroundColor: `${Colors.blue}20`, borderWidth: 1, borderColor: `${Colors.blue}40`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  doneBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
  tlCardTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  tlCardDesc: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },
  tlCardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, justifyContent: "flex-end" },
  tlMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  tlMetaText: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  tlXpText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: Colors.gold },
  tlMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderColor: Colors.cardBorder, maxHeight: "92%", overflow: "hidden" },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHero: { alignItems: "center", padding: 24, gap: 8 },
  sheetIconBg: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${Colors.blue}30` },
  sheetTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "center" },
  sheetDesc: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "center" },
  sheetStats: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, backgroundColor: Colors.backgroundCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.cardBorder, paddingVertical: 16 },
  sheetStatItem: { flex: 1, alignItems: "center", gap: 4 },
  sheetStatLabel: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  sheetStatDivider: { width: 1, height: 28, backgroundColor: Colors.cardBorder },
  sheetSection: { padding: 20, gap: 12 },
  sheetSectionTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
  skillPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${Colors.success}12`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: `${Colors.success}30` },
  skillPillText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: Colors.success },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 20, marginBottom: 12, backgroundColor: `${Colors.gold}10`, borderRadius: 14, borderWidth: 1, borderColor: `${Colors.gold}20`, padding: 14 },
  tipBoxText: { flex: 1, fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.text, textAlign: "right", lineHeight: 22 },
  aiBox: { marginHorizontal: 20, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: `${Colors.blue}30`, padding: 14, gap: 4, overflow: "hidden" },
  aiBadgeRow: { flexDirection: "row", justifyContent: "flex-end" },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${Colors.blue}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: `${Colors.blue}25` },
  aiBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold", color: Colors.blueLight },
  aiLoading: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textMuted },
  aiText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.text, textAlign: "right", lineHeight: 22 },
  sheetActions: { padding: 20, gap: 10, paddingBottom: 36 },
  mainBtn: { borderRadius: 18, overflow: "hidden" },
  mainBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 17, borderRadius: 18 },
  mainBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
});
