import React, { useState, useEffect, useRef } from "react";
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
  TextInput,
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
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import * as Speech from "expo-speech";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { SaudiAvatar } from "@/components/Avatar";
import { apiRequest, getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");

const STAGES = [
  { id: 1, title: "المحادثة الأولى", titleEn: "First Conversation", desc: "أساسيات التواصل اليومي", descEn: "Daily communication basics", icon: "chatbubbles-outline", xp: 50, lessons: 3, duration: "10 دقائق", durationEn: "10 min", skills: ["التحية", "التعريف بالنفس", "الأسئلة الأساسية"], tip: "ركز على التحدث بثقة، الأخطاء جزء من التعلم!", color: "#2563EB" },
  { id: 2, title: "الأسئلة والأجوبة", titleEn: "Q&A", desc: "مهارات الاستفسار والرد", descEn: "Inquiry and response skills", icon: "help-circle-outline", xp: 75, lessons: 4, duration: "15 دقيقة", durationEn: "15 min", skills: ["صياغة الأسئلة", "الردود المناسبة", "لغة الجسد"], tip: "اسأل أسئلة مفتوحة لتحفيز المحادثة", color: "#7C3AED" },
  { id: 3, title: "تقديم النفس", titleEn: "Self Introduction", desc: "كيف تُقدم نفسك باحتراف", descEn: "Present yourself professionally", icon: "person-outline", xp: 60, lessons: 3, duration: "12 دقيقة", durationEn: "12 min", skills: ["المقدمة الشخصية", "ذكر الاهتمامات", "الانطباع الأول"], tip: "ابتسم وحافظ على التواصل البصري", color: "#06B6D4" },
  { id: 4, title: "الجمل المركبة", titleEn: "Complex Sentences", desc: "بناء جمل أكثر تعقيداً ودقة", descEn: "Build complex, precise sentences", icon: "text-outline", xp: 100, lessons: 5, duration: "20 دقيقة", durationEn: "20 min", skills: ["روابط الجمل", "التعبير عن الرأي", "الصفات والأوصاف"], tip: "استخدم روابط مثل: لأن، لذلك، ومع ذلك", color: "#10B981" },
  { id: 5, title: "المقابلة الوظيفية", titleEn: "Job Interview", desc: "حضّر نفسك للمقابلات المهنية", descEn: "Prepare for professional interviews", icon: "briefcase-outline", xp: 150, lessons: 6, duration: "30 دقيقة", durationEn: "30 min", skills: ["STAR Method", "نقاط القوة والضعف", "الأسئلة الصعبة"], tip: "استعد بأمثلة حقيقية من تجاربك", color: "#F59E0B" },
  { id: 6, title: "النقاش والإقناع", titleEn: "Debate & Persuasion", desc: "فن الحجة والإقناع المؤثر", descEn: "The art of persuasive argument", icon: "mic-outline", xp: 120, lessons: 5, duration: "25 دقيقة", durationEn: "25 min", skills: ["بناء الحجج", "الرد على الاعتراضات", "لغة الإقناع"], tip: "استمع جيداً قبل أن ترد", color: "#EF4444" },
  { id: 7, title: "الذكاء الاصطناعي", titleEn: "Artificial Intelligence", desc: "التحدث عن التقنية والمستقبل", descEn: "Talking about tech & the future", icon: "hardware-chip-outline", xp: 100, lessons: 4, duration: "20 دقيقة", durationEn: "20 min", skills: ["مصطلحات التقنية", "نقاش المستقبل", "الآراء التقنية"], tip: "لا تخف من التعبير عن رأيك في التقنية", color: "#8B5CF6" },
  { id: 8, title: "الخطابة والعرض", titleEn: "Public Speaking", desc: "مهارات التقديم أمام الجمهور", descEn: "Presentation skills for any audience", icon: "podium-outline", xp: 150, lessons: 6, duration: "35 دقيقة", durationEn: "35 min", skills: ["بنية العرض", "لغة الجسد", "إدارة التوتر"], tip: "تدرب أمام المرآة أو سجّل نفسك", color: "#F97316" },
];

type Stage = typeof STAGES[0];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { profile, points, streak, completedStages, completeStage, language } = useApp();
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [stageLoading, setStageLoading] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [wordOfDay, setWordOfDay] = useState<{ word: string; translation: string; pronunciation: string; example: string; tip: string } | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);

  const isRTL = language === "ar";
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);
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

  const s = makeStyles(colors, isRTL, isDark);

  return (
    <GridBackground style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: botPad + 110 }}
      >
        {/* Header */}
        <View style={[s.header, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <View style={s.streakBadge}>
            <Ionicons name="flame" size={16} color="#F97316" />
            <Text style={s.streakNum}>{streak}</Text>
          </View>
          <Text style={s.appName}>نطق</Text>
          <View style={s.pointsBadge}>
            <Ionicons name="star" size={14} color={colors.gold} />
            <Text style={s.pointsNum}>{points}</Text>
          </View>
        </View>

        {/* Greeting */}
        <View style={s.greetingRow}>
          <Text style={s.greetingText}>
            {isRTL ? `مرحباً، ${profile.name}` : `Hello, ${profile.name}`}
          </Text>
          <Text style={s.greetingSubtext}>
            {isRTL ? "استمر في رحلتك اليوم!" : "Keep up the great work today!"}
          </Text>
        </View>

        {/* Daily Goal Card */}
        <View style={s.goalCard}>
          <LinearGradient
            colors={isDark ? [`${colors.blue}22`, `${colors.purple}12`] : [`${colors.blue}15`, `${colors.purple}08`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
          <View style={s.goalInner}>
            <View style={[s.goalHeader, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
              <Text style={s.goalPct}>{Math.round(progressPct * 100)}%</Text>
              <View>
                <Text style={s.goalTitle}>{isRTL ? "هدف اليوم" : "Daily Goal"}</Text>
                <Text style={s.goalSub}>
                  {isRTL ? `${dailyProgress} من ${dailyGoal} مراحل` : `${dailyProgress} of ${dailyGoal} stages`}
                </Text>
              </View>
            </View>
            <View style={s.progressTrack}>
              <LinearGradient
                colors={[colors.blue, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.progressFill, { width: `${Math.max(4, progressPct * 100)}%` }]}
              />
            </View>
            <View style={[s.goalDots, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {Array.from({ length: dailyGoal }).map((_, i) => (
                <View key={i} style={[s.goalDot, i < dailyProgress && s.goalDotFilled]} />
              ))}
            </View>
          </View>
        </View>

        {/* Word of the Day */}
        {wordOfDay && (
          <View style={s.wordCard}>
            <LinearGradient
              colors={isDark ? [`${colors.gold}12`, `${colors.purple}06`] : [`${colors.gold}10`, `${colors.blue}06`]}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
            />
            <View style={[s.wordTop, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
              <Text style={s.wordPronounce}>{wordOfDay.pronunciation}</Text>
              <View style={s.wordBadge}>
                <Ionicons name="bulb-outline" size={12} color={colors.gold} />
                <Text style={s.wordBadgeLabel}>{isRTL ? "كلمة اليوم" : "Word of the Day"}</Text>
              </View>
            </View>
            <Text style={s.wordMain}>{wordOfDay.word}</Text>
            <Text style={s.wordTr}>{wordOfDay.translation}</Text>
            <View style={s.wordDivider} />
            <Text style={s.wordEx} numberOfLines={2}>{wordOfDay.example}</Text>
          </View>
        )}

        {/* AI Chat Card */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/chat"); }}
          style={({ pressed }) => [s.aiCard, pressed && { opacity: 0.88 }]}
          testID="home-chat-btn"
        >
          <LinearGradient
            colors={isDark ? [`${colors.blue}28`, `${colors.purple}18`] : [`${colors.blue}18`, `${colors.purple}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
          <View style={[s.aiCardInner, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={[s.aiCardChevron, { transform: [{ scaleX: isRTL ? 1 : -1 }] }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </View>
            <View style={s.aiCardText}>
              <Text style={[s.aiCardTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "المساعد الذكي" : "AI Assistant"}
              </Text>
              <Text style={[s.aiCardSub, { textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "تحدث، اسأل، واحصل على مساعدة فورية" : "Talk, ask, and get help instantly"}
              </Text>
            </View>
            <View style={[s.aiCardIcon, { backgroundColor: `${colors.blue}22`, borderColor: `${colors.blue}40` }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.blue} />
            </View>
          </View>
        </Pressable>

        {/* English Tutor Card */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/english-tutor"); }}
          style={({ pressed }) => [s.aiCard, pressed && { opacity: 0.88 }]}
          testID="home-tutor-btn"
        >
          <LinearGradient
            colors={isDark ? ["#7C3AED28", "#4C1D9518"] : ["#7C3AED18", "#4C1D9508"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
          <View style={[s.aiCardInner, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={[s.aiCardChevron, { transform: [{ scaleX: isRTL ? 1 : -1 }] }]}>
              <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
            </View>
            <View style={s.aiCardText}>
              <Text style={[s.aiCardTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "مدرسة الإنجليزية - Lia" : "English Tutor – Lia"}
              </Text>
              <Text style={[s.aiCardSub, { textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "تحدث إنجليزي مع مدرس AI صديق" : "Practice English with a friendly AI tutor"}
              </Text>
            </View>
            <View style={[s.aiCardIcon, { backgroundColor: "#7C3AED22", borderColor: "#7C3AED40" }]}>
              <Ionicons name="language-outline" size={22} color="#A78BFA" />
            </View>
          </View>
        </Pressable>

        {/* Learning Path */}
        <View style={s.pathSection}>
          <View style={[s.pathHeaderRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <View style={s.pathProgressBadge}>
              <Text style={s.pathProgress}>{completedStages.length}/{STAGES.length}</Text>
            </View>
            <Text style={s.pathTitle}>{isRTL ? "مسار التعلم" : "Learning Path"}</Text>
          </View>

          <View style={s.timeline}>
            <View style={[s.timelineLine, isRTL ? { left: 28 } : { right: 28 }]}>
              <LinearGradient
                colors={[colors.blue, colors.purple, `${colors.purple}20`]}
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
                  isRTL={isRTL}
                  isDark={isDark}
                  colors={colors}
                  language={language}
                  onPress={() => openStage(stage)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Voice Chat FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setVoiceOpen(true);
        }}
        style={({ pressed }) => [
          s.voiceFab,
          { bottom: botPad + 90 },
          pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
        ]}
      >
        <LinearGradient
          colors={[colors.purple, colors.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.voiceFabGrad}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </LinearGradient>
        <View style={s.voiceFabBadge}>
          <Ionicons name="hardware-chip-outline" size={9} color="#fff" />
        </View>
      </Pressable>

      {/* Stage Detail Modal */}
      {activeStage && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setActiveStage(null)}>
          <View style={s.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveStage(null)} />
            <View style={s.sheet}>
              <View style={s.sheetHandle} />
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={s.sheetHero}>
                  <LinearGradient
                    colors={[`${activeStage.color}30`, `${activeStage.color}10`]}
                    style={s.sheetIconBg}
                  >
                    <Ionicons name={activeStage.icon as any} size={36} color={activeStage.color} />
                  </LinearGradient>
                  <Text style={s.sheetTitle}>
                    {isRTL ? activeStage.title : activeStage.titleEn}
                  </Text>
                  <Text style={s.sheetDesc}>
                    {isRTL ? activeStage.desc : activeStage.descEn}
                  </Text>
                </View>

                <View style={s.sheetStats}>
                  <View style={s.sheetStatItem}>
                    <Ionicons name="time-outline" size={18} color={colors.blueLight} />
                    <Text style={[s.sheetStatLabel, { color: colors.blueLight }]}>
                      {isRTL ? activeStage.duration : activeStage.durationEn}
                    </Text>
                  </View>
                  <View style={s.sheetStatDivider} />
                  <View style={s.sheetStatItem}>
                    <Ionicons name="book-outline" size={18} color={colors.purple} />
                    <Text style={[s.sheetStatLabel, { color: colors.purple }]}>
                      {isRTL ? `${activeStage.lessons} دروس` : `${activeStage.lessons} lessons`}
                    </Text>
                  </View>
                  <View style={s.sheetStatDivider} />
                  <View style={s.sheetStatItem}>
                    <Ionicons name="star" size={18} color={colors.gold} />
                    <Text style={[s.sheetStatLabel, { color: colors.gold }]}>+{activeStage.xp} XP</Text>
                  </View>
                </View>

                <View style={s.sheetSection}>
                  <Text style={s.sheetSectionTitle}>
                    {isRTL ? "المهارات المكتسبة" : "Skills Gained"}
                  </Text>
                  <View style={s.skillsWrap}>
                    {activeStage.skills.map((sk, i) => (
                      <View key={i} style={[s.skillPill, { borderColor: `${activeStage.color}40`, backgroundColor: `${activeStage.color}12` }]}>
                        <Ionicons name="checkmark-circle" size={13} color={activeStage.color} />
                        <Text style={[s.skillPillText, { color: activeStage.color }]}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={s.tipBox}>
                  <Ionicons name="flash" size={16} color={colors.gold} />
                  <Text style={s.tipBoxText}>{activeStage.tip}</Text>
                </View>

                {(aiHint || hintLoading) && (
                  <View style={s.aiBox}>
                    <LinearGradient
                      colors={[`${colors.blue}18`, `${colors.purple}10`]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                    />
                    <View style={s.aiBadgeRow}>
                      <View style={s.aiBadge}>
                        <Ionicons name="hardware-chip-outline" size={12} color={colors.blueLight} />
                        <Text style={s.aiBadgeText}>نطق AI</Text>
                      </View>
                    </View>
                    {hintLoading ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <ActivityIndicator size="small" color={colors.blue} />
                        <Text style={s.aiLoading}>{isRTL ? "يفكر..." : "Thinking..."}</Text>
                      </View>
                    ) : (
                      <Text style={s.aiText}>{aiHint}</Text>
                    )}
                  </View>
                )}

                <View style={s.sheetActions}>
                  <Pressable
                    onPress={completedStages.includes(activeStage.id) ? () => setActiveStage(null) : finishStage}
                    disabled={stageLoading}
                    style={({ pressed }) => [s.mainBtn, pressed && { opacity: 0.85 }]}
                  >
                    <LinearGradient
                      colors={completedStages.includes(activeStage.id) ? [colors.success, "#059669"] : [colors.blue, colors.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={s.mainBtnGrad}
                    >
                      {stageLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : completedStages.includes(activeStage.id) ? (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={s.mainBtnText}>{isRTL ? "مكتملة" : "Completed"}</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="play-circle" size={20} color="#fff" />
                          <Text style={s.mainBtnText}>{isRTL ? "ابدأ المرحلة" : "Start Stage"}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => setActiveStage(null)} style={s.cancelBtn}>
                    <Text style={s.cancelBtnText}>{isRTL ? "لاحقاً" : "Later"}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Voice Chat Modal */}
      {voiceOpen && (
        <VoiceChatModal
          onClose={() => setVoiceOpen(false)}
          colors={colors}
          isDark={isDark}
          isRTL={isRTL}
          language={language}
        />
      )}
    </GridBackground>
  );
}

function TimelineRow({ stage, isCompleted, isUnlocked, isActive, isLast, isRTL, isDark, colors, language, onPress }: {
  stage: Stage;
  isCompleted: boolean;
  isUnlocked: boolean;
  isActive: boolean;
  isLast: boolean;
  isRTL: boolean;
  isDark: boolean;
  colors: any;
  language: string;
  onPress: () => void;
}) {
  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.92, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 1100 }), withTiming(0.2, { duration: 1100 })),
        -1,
        true
      );
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const nodeColor = isCompleted
    ? stage.color
    : isActive
    ? `${stage.color}CC`
    : isDark
    ? colors.backgroundCard
    : colors.backgroundCardBorder;
  const nodeBorder = isCompleted ? stage.color : isActive ? stage.color : colors.cardBorder;

  const s = makeStyles(colors, isRTL, isDark);

  return (
    <View style={[s.tlRow, isLast && { marginBottom: 0 }, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
      <View style={s.tlNodeCol}>
        {isActive && (
          <Animated.View style={[s.tlGlow, glowStyle, { backgroundColor: `${stage.color}40` }]} />
        )}
        <Animated.View style={pulseStyle}>
          <Pressable
            onPress={onPress}
            style={[s.tlNode, { backgroundColor: nodeColor, borderColor: nodeBorder }]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={22} color="#fff" />
            ) : isUnlocked ? (
              <Ionicons name={stage.icon as any} size={20} color={isActive ? "#fff" : colors.textMuted} />
            ) : (
              <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
            )}
          </Pressable>
        </Animated.View>
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          s.tlCard,
          isCompleted && { borderColor: `${stage.color}35` },
          isActive && { borderColor: `${stage.color}55` },
          !isUnlocked && s.tlCardLocked,
          pressed && isUnlocked && { opacity: 0.88 },
        ]}
      >
        {isActive && (
          <LinearGradient
            colors={[`${stage.color}18`, `${stage.color}06`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
        )}
        {isCompleted && (
          <LinearGradient
            colors={[`${stage.color}10`, `${stage.color}04`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
        )}

        {/* Color accent bar */}
        <View style={[
          s.tlAccentBar,
          { backgroundColor: stage.color, opacity: isUnlocked ? 1 : 0.3 },
          isRTL ? { borderTopRightRadius: 4, borderBottomRightRadius: 4, right: 0 } : { borderTopLeftRadius: 4, borderBottomLeftRadius: 4, left: 0 },
        ]} />

        <View style={[s.tlCardContent, { paddingRight: isRTL ? 14 : 20, paddingLeft: isRTL ? 20 : 14 }]}>
          <View style={[s.tlCardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {isActive && (
              <View style={[s.currentBadge, { backgroundColor: `${stage.color}25`, borderColor: `${stage.color}50` }]}>
                <Text style={[s.currentBadgeText, { color: stage.color }]}>
                  {language === "ar" ? "الحالية" : "Current"}
                </Text>
              </View>
            )}
            {isCompleted && (
              <View style={s.doneBadge}>
                <Ionicons name="checkmark-circle" size={12} color={stage.color} />
                <Text style={[s.doneBadgeText, { color: stage.color }]}>
                  {language === "ar" ? "مكتملة" : "Done"}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[s.tlCardTitle, { textAlign: isRTL ? "right" : "left" }, !isUnlocked && { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {language === "ar" ? stage.title : stage.titleEn}
          </Text>
          <Text
            style={[s.tlCardDesc, { textAlign: isRTL ? "right" : "left" }, !isUnlocked && { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {language === "ar" ? stage.desc : stage.descEn}
          </Text>
          <View style={[s.tlCardMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={s.tlMetaItem}>
              <Ionicons name="time-outline" size={11} color={isUnlocked ? colors.textSecondary : colors.textMuted} />
              <Text style={[s.tlMetaText, !isUnlocked && { color: colors.textMuted }]}>
                {language === "ar" ? stage.duration : stage.durationEn}
              </Text>
            </View>
            <View style={s.tlMetaDot} />
            <View style={s.tlMetaItem}>
              <Ionicons name="star" size={11} color={isUnlocked ? colors.gold : colors.textMuted} />
              <Text style={[s.tlXpText, !isUnlocked && { color: colors.textMuted }]}>+{stage.xp}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function VoiceChatModal({ onClose, colors, isDark, isRTL, language }: {
  onClose: () => void;
  colors: any;
  isDark: boolean;
  isRTL: boolean;
  language: string;
}) {
  const [phase, setPhase] = useState<"idle" | "listening" | "processing" | "speaking" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [textInput, setTextInput] = useState("");
  const phaseRef = useRef<string>("idle");
  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nativeRecordingRef = useRef<Audio.Recording | null>(null);
  const nativeSoundRef = useRef<Audio.Sound | null>(null);

  // Keep phaseRef in sync so async callbacks always see current phase
  function setPhaseSync(p: "idle" | "listening" | "processing" | "speaking" | "done") {
    phaseRef.current = p;
    setPhase(p);
  }

  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring3 = useSharedValue(1);
  const wave1 = useSharedValue(0.3);
  const wave2 = useSharedValue(0.3);
  const wave3 = useSharedValue(0.3);
  const wave4 = useSharedValue(0.3);
  const wave5 = useSharedValue(0.3);

  useEffect(() => {
    if (phase === "listening") {
      ring1.value = withRepeat(withSequence(withTiming(1.4, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
      ring2.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 600 })), -1, false);
      ring3.value = withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(1.8, { duration: 800 }), withTiming(1, { duration: 600 })), -1, false);
      wave1.value = 0.3; wave2.value = 0.3; wave3.value = 0.3; wave4.value = 0.3; wave5.value = 0.3;
    } else if (phase === "speaking") {
      ring1.value = withTiming(1, { duration: 200 });
      ring2.value = withTiming(1, { duration: 200 });
      ring3.value = withTiming(1, { duration: 200 });
      wave1.value = withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0.2, { duration: 280 })), -1, false);
      wave2.value = withRepeat(withSequence(withTiming(0.5, { duration: 180 }), withTiming(0.9, { duration: 350 }), withTiming(0.3, { duration: 220 })), -1, false);
      wave3.value = withRepeat(withSequence(withTiming(0.8, { duration: 250 }), withTiming(0.2, { duration: 300 }), withTiming(1, { duration: 280 })), -1, false);
      wave4.value = withRepeat(withSequence(withTiming(0.4, { duration: 320 }), withTiming(0.9, { duration: 250 })), -1, false);
      wave5.value = withRepeat(withSequence(withTiming(0.9, { duration: 200 }), withTiming(0.3, { duration: 350 })), -1, false);
    } else {
      ring1.value = withTiming(1, { duration: 300 });
      ring2.value = withTiming(1, { duration: 300 });
      ring3.value = withTiming(1, { duration: 300 });
      wave1.value = withTiming(0.3, { duration: 300 });
      wave2.value = withTiming(0.3, { duration: 300 });
      wave3.value = withTiming(0.3, { duration: 300 });
      wave4.value = withTiming(0.3, { duration: 300 });
      wave5.value = withTiming(0.3, { duration: 300 });
    }
  }, [phase]);

  const wBar1 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave1.value }] }));
  const wBar2 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave2.value }] }));
  const wBar3 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave3.value }] }));
  const wBar4 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave4.value }] }));
  const wBar5 = useAnimatedStyle(() => ({ transform: [{ scaleY: wave5.value }] }));

  const r1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: 2 - ring1.value,
  }));
  const r2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: Math.max(0, 2 - ring2.value),
  }));
  const r3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3.value }],
    opacity: Math.max(0, 2 - ring3.value),
  }));

  // Always use window.fetch for binary/streaming — expo/fetch can't handle arrayBuffer or SSE on web
  const nativeFetch: typeof globalThis.fetch =
    typeof window !== "undefined" ? window.fetch.bind(window) : globalThis.fetch;

  async function speakWithSpeechFallback(text: string) {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    setPhaseSync("speaking");
    Speech.speak(text.slice(0, 500), {
      language: "en-US",
      rate: 0.95,
      onDone: () => setPhaseSync("done"),
      onError: () => setPhaseSync("done"),
      onStopped: () => setPhaseSync("done"),
    });
  }

  async function speakText(text: string) {
    if (!text.trim()) { setPhaseSync("done"); return; }
    try {
      const baseUrl = getApiUrl();
      if (Platform.OS === "web") {
        const res = await nativeFetch(`${baseUrl}api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 500), voice: "shimmer" }),
        });
        if (!res.ok) {
          // Web fallback: browser speechSynthesis via expo-speech
          setPhaseSync("speaking");
          Speech.speak(text.slice(0, 500), {
            language: "en-US",
            rate: 0.95,
            onDone: () => setPhaseSync("done"),
            onError: () => setPhaseSync("done"),
          });
          return;
        }
        const arrayBuf = await res.arrayBuffer();
        const blob = new Blob([arrayBuf], { type: "audio/mpeg" });
        const blobUrl = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          try { URL.revokeObjectURL(audioRef.current.src); } catch {}
        }
        const audio = new Audio(blobUrl);
        audioRef.current = audio;
        setPhaseSync("speaking");
        audio.onended = () => { setPhaseSync("done"); try { URL.revokeObjectURL(blobUrl); } catch {} };
        audio.onerror = () => { setPhaseSync("done"); try { URL.revokeObjectURL(blobUrl); } catch {} };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => { setPhaseSync("done"); try { URL.revokeObjectURL(blobUrl); } catch {} });
        }
      } else {
        // Native: download MP3 to temp file, play with expo-av
        const tmpUri = FileSystem.cacheDirectory + `nutq_tts_${Date.now()}.mp3`;
        const dlRes = await FileSystem.downloadAsync(
          `${baseUrl}api/tts-get?text=${encodeURIComponent(text.slice(0, 500))}`,
          tmpUri
        );
        if (dlRes.status !== 200) {
          // Native fallback: expo-speech (device TTS via main speaker)
          await speakWithSpeechFallback(text);
          return;
        }
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        if (nativeSoundRef.current) {
          try { await nativeSoundRef.current.unloadAsync(); } catch {}
          nativeSoundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync({ uri: tmpUri }, { shouldPlay: true });
        nativeSoundRef.current = sound;
        setPhaseSync("speaking");
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPhaseSync("done");
            sound.unloadAsync().catch(() => {});
            FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
          }
        });
      }
    } catch {
      // Final fallback: always ensure some audio plays
      await speakWithSpeechFallback(text);
    }
  }

  async function sendToAI(text: string) {
    setPhaseSync("processing");
    setErrorMsg("");
    try {
      const baseUrl = getApiUrl();
      // web: window.fetch for proper SSE/ReadableStream; native: expoFetch supports getReader()
      const fetchFn = Platform.OS === "web" ? nativeFetch : expoFetch;
      const response = await fetchFn(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }], mode: "casual" }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]" || !data) continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) { full += parsed.content; setAiResponse(full); }
          } catch {}
        }
      }
      if (!full.trim()) throw new Error("Empty response");
      await speakText(full);
    } catch (e: any) {
      setErrorMsg("Connection failed. Try again.");
      setPhaseSync("idle");
    }
  }

  function stopStream() {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
  }

  async function startListeningNative() {
    setTranscript("");
    setAiResponse("");
    setErrorMsg("");

    // Request mic permission
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("__mic_denied__");
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      nativeRecordingRef.current = recording;
      setPhaseSync("listening");
    } catch (err) {
      setErrorMsg("Could not access microphone");
    }
  }

  async function stopListeningNative() {
    const recording = nativeRecordingRef.current;
    if (!recording) return;
    nativeRecordingRef.current = null;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {}

    const uri = recording.getURI();
    if (!uri) {
      setErrorMsg("Nothing heard. Try again.");
      setPhaseSync("idle");
      return;
    }

    setPhaseSync("processing");
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const baseUrl = getApiUrl();
      const sttRes = await fetch(`${baseUrl}api/stt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          mimeType: "audio/m4a",
          language: "en",
        }),
      });
      if (!sttRes.ok) throw new Error("STT failed");
      const { text } = await sttRes.json();
      if (!text?.trim()) {
        setErrorMsg("Nothing heard. Try again.");
        setPhaseSync("idle");
        return;
      }
      setTranscript(text);
      await sendToAI(text);
    } catch {
      setErrorMsg("Speech recognition failed. Try again.");
      setPhaseSync("idle");
    } finally {
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }

  async function startListening() {
    setTranscript("");
    setAiResponse("");
    setErrorMsg("");

    if (Platform.OS !== "web") {
      await startListeningNative();
      return;
    }

    // Web: MediaRecorder
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("Browser doesn't support audio recording");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      if (denied) {
        setErrorMsg("__mic_denied__");
      } else {
        setErrorMsg("Could not access microphone");
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e: any) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stopStream();
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        if (phaseRef.current !== "processing") setPhaseSync("idle");
        return;
      }
      setPhaseSync("processing");
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = (reader.result as string).split(",")[1];
            if (result) resolve(result);
            else reject(new Error("empty base64"));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const baseUrl = getApiUrl();
        const sttRes = await nativeFetch(`${baseUrl}api/stt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: mimeType.split(";")[0], language: "en" }),
        });
        if (!sttRes.ok) throw new Error("STT failed");
        const { text } = await sttRes.json();
        if (!text?.trim()) {
          setErrorMsg("Nothing heard. Try again.");
          setPhaseSync("idle");
          return;
        }
        setTranscript(text);
        await sendToAI(text);
      } catch {
        setErrorMsg("Speech recognition failed. Try again.");
        setPhaseSync("idle");
      }
    };

    recorder.start();
    setPhaseSync("listening");
  }

  function stopListening() {
    if (Platform.OS !== "web") {
      stopListeningNative();
      return;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleTextSend() {
    const t = textInput.trim();
    if (!t || phaseRef.current === "processing" || phaseRef.current === "speaking") return;
    setTranscript(t);
    setTextInput("");
    sendToAI(t);
  }

  function reset() {
    if (Platform.OS === "web") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      stopStream();
    } else {
      if (nativeRecordingRef.current) {
        try { nativeRecordingRef.current.stopAndUnloadAsync().catch(() => {}); } catch {}
        nativeRecordingRef.current = null;
      }
      if (nativeSoundRef.current) {
        try { nativeSoundRef.current.stopAsync().catch(() => {}); } catch {}
        nativeSoundRef.current = null;
      }
    }
    setPhaseSync("idle");
    setTranscript("");
    setAiResponse("");
    setErrorMsg("");
    setTextInput("");
  }

  const micColor = phase === "listening" ? "#EF4444" : phase === "speaking" ? "#10B981" : colors.purple;
  const sheetBg = isDark ? colors.backgroundSecondary : colors.backgroundCard;

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, justifyContent: "flex-end" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[vmStyles.sheet, { backgroundColor: sheetBg, borderTopColor: colors.cardBorder }]}>
          <View style={[vmStyles.handle, { backgroundColor: colors.cardBorder }]} />

          <View style={vmStyles.headerRow}>
            <Pressable onPress={onClose} style={vmStyles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
            <View style={vmStyles.aiBadge}>
              <Ionicons name="hardware-chip-outline" size={13} color={colors.blueLight} />
              <Text style={[vmStyles.aiBadgeText, { color: colors.blueLight }]}>
                {"Nutq AI – Voice Chat"}
              </Text>
            </View>
            <View style={{ width: 34 }} />
          </View>

          <View style={vmStyles.micArea}>
            {phase === "listening" && (
              <>
                <Animated.View style={[vmStyles.ring, { borderColor: `${micColor}30` }, r3Style]} />
                <Animated.View style={[vmStyles.ring, { borderColor: `${micColor}50`, width: 140, height: 140 }, r2Style]} />
                <Animated.View style={[vmStyles.ring, { borderColor: `${micColor}70`, width: 110, height: 110 }, r1Style]} />
              </>
            )}
            {phase === "speaking" && (
              <View style={vmStyles.waveRow}>
                {([wBar1, wBar2, wBar3, wBar4, wBar5] as const).map((style, i) => (
                  <Animated.View key={i} style={[vmStyles.waveBar, { backgroundColor: "#10B981" }, style]} />
                ))}
              </View>
            )}
            <Pressable
              onPress={
                phase === "idle" || phase === "done" ? startListening
                : phase === "speaking" ? reset
                : phase === "listening" ? stopListening
                : undefined
              }
              disabled={phase === "processing"}
              style={({ pressed }) => [vmStyles.micBtn, { backgroundColor: micColor }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
            >
              {phase === "processing" ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : phase === "speaking" ? (
                <Ionicons name="volume-high" size={36} color="#fff" />
              ) : (
                <Ionicons name={phase === "listening" ? "stop" : "mic"} size={36} color="#fff" />
              )}
            </Pressable>
          </View>

          <Text style={[vmStyles.phaseLabel, { color: colors.textSecondary }]}>
            {phase === "idle" || phase === "done"
              ? "Tap mic or type below"
              : phase === "listening"
              ? "Listening... tap to stop"
              : phase === "speaking"
              ? "Nutq is speaking..."
              : "Nutq is thinking..."}
          </Text>

          {transcript !== "" && (
            <View style={[vmStyles.transcriptBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[vmStyles.transcriptLabel, { color: colors.textMuted }]}>
                {"You said:"}
              </Text>
              <Text style={[vmStyles.transcriptText, { color: colors.text, textAlign: "left" }]}>
                {transcript}
              </Text>
            </View>
          )}

          {aiResponse !== "" && (
            <View style={[vmStyles.responseBox, { borderColor: `${colors.blue}30` }]}>
              <LinearGradient
                colors={[`${colors.blue}15`, `${colors.purple}08`]}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <Text style={[vmStyles.responseText, { color: colors.text, textAlign: "left" }]}>
                {aiResponse}
              </Text>
            </View>
          )}

          {errorMsg === "__mic_denied__" ? (
            <View style={[vmStyles.micDeniedBox, { backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }]}>
              <Ionicons name="mic-off-outline" size={18} color="#EF4444" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[vmStyles.micDeniedText, { color: colors.text }]}>
                  {Platform.OS === "web"
                    ? "Microphone blocked in this preview"
                    : "Microphone blocked"}
                </Text>
                <Text style={[vmStyles.micDeniedSub, { color: colors.textSecondary }]}>
                  {Platform.OS === "web"
                    ? "Open in a new tab to allow microphone access"
                    : "Go to Settings → Nutq → Microphone"}
                </Text>
              </View>
              {Platform.OS === "web" && (
                <Pressable
                  onPress={() => window.open(window.location.href, "_blank")}
                  style={vmStyles.newTabBtn}
                >
                  <Ionicons name="open-outline" size={14} color="#fff" />
                </Pressable>
              )}
            </View>
          ) : errorMsg !== "" ? (
            <Text style={[vmStyles.errorText, { color: colors.error }]}>{errorMsg}</Text>
          ) : null}

          {/* Text input — always visible on all platforms as fallback */}
          <View style={[vmStyles.nativeInputRow, { borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.backgroundCard }]}>
            <Pressable
              onPress={handleTextSend}
              disabled={!textInput.trim() || phase === "processing" || phase === "speaking"}
              style={[vmStyles.nativeSendBtn, { backgroundColor: !textInput.trim() ? colors.textMuted : colors.blue, opacity: !textInput.trim() ? 0.4 : 1 }]}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </Pressable>
            <TextInput
              style={[vmStyles.nativeInput, { color: colors.text }]}
              placeholder={"Or type your message..."}
              placeholderTextColor={colors.textMuted}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleTextSend}
              returnKeyType="send"
              textAlign={"left"}
              editable={phase !== "processing" && phase !== "speaking"}
            />
          </View>

          {phase === "done" && (
            <Pressable onPress={reset} style={[vmStyles.resetBtn, { borderColor: colors.border }]}>
              <Text style={[vmStyles.resetBtnText, { color: colors.textSecondary }]}>
                {"New conversation"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: any, isRTL: boolean, isDark: boolean) {
  const glassCard = isDark
    ? { backgroundColor: "rgba(20,20,42,0.75)", borderColor: "rgba(255,255,255,0.08)" }
    : { backgroundColor: "rgba(255,255,255,0.82)", borderColor: "rgba(100,100,220,0.15)" };

  return StyleSheet.create({
    header: { alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 },
    appName: { fontSize: 22, fontFamily: "Cairo_700Bold", color: colors.text, letterSpacing: 1 },
    streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F9731618", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: "#F9731630" },
    streakNum: { fontSize: 14, fontFamily: "Cairo_700Bold", color: "#F97316" },
    pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${colors.gold}18`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: `${colors.gold}30` },
    pointsNum: { fontSize: 14, fontFamily: "Cairo_700Bold", color: colors.gold },

    greetingRow: { paddingHorizontal: 20, marginBottom: 16, gap: 2 },
    greetingText: { fontSize: 22, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: isRTL ? "right" : "left" },
    greetingSubtext: { fontSize: 13, fontFamily: "Cairo_400Regular", color: colors.textSecondary, textAlign: isRTL ? "right" : "left" },

    goalCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, borderWidth: 1.5, borderColor: `${colors.blue}25`, overflow: "hidden", ...glassCard },
    goalInner: { padding: 18, gap: 12 },
    goalHeader: { alignItems: "center", justifyContent: "space-between" },
    goalTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: isRTL ? "right" : "left" },
    goalSub: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textSecondary, textAlign: isRTL ? "right" : "left" },
    goalPct: { fontSize: 32, fontFamily: "Cairo_700Bold", color: colors.blueLight },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.backgroundCardBorder, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    goalDots: { gap: 8, justifyContent: isRTL ? "flex-end" : "flex-start" },
    goalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.backgroundCardBorder, borderWidth: 1, borderColor: colors.cardBorder },
    goalDotFilled: { backgroundColor: colors.blue, borderColor: colors.blue },

    wordCard: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: `${colors.gold}20`, gap: 6, overflow: "hidden", ...glassCard },
    wordTop: { justifyContent: "space-between", alignItems: "center" },
    wordBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${colors.gold}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: `${colors.gold}25` },
    wordBadgeLabel: { fontSize: 11, fontFamily: "Cairo_700Bold", color: colors.gold },
    wordPronounce: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textMuted },
    wordMain: { fontSize: 28, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: isRTL ? "right" : "left" },
    wordTr: { fontSize: 15, fontFamily: "Cairo_600SemiBold", color: colors.blueLight, textAlign: isRTL ? "right" : "left" },
    wordDivider: { height: 1, backgroundColor: colors.border },
    wordEx: { fontSize: 13, fontFamily: "Cairo_400Regular", color: colors.textSecondary, textAlign: isRTL ? "right" : "left", lineHeight: 20 },

    aiCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 18, borderWidth: 1.5, borderColor: `${colors.blue}30`, overflow: "hidden", ...glassCard },
    aiCardInner: { alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
    aiCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    aiCardText: { flex: 1, gap: 3 },
    aiCardTitle: { fontSize: 16, fontFamily: "Cairo_700Bold", color: colors.text },
    aiCardSub: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    aiCardChevron: { opacity: 0.5 },

    pathSection: { paddingHorizontal: 20 },
    pathHeaderRow: { alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    pathTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: colors.text },
    pathProgressBadge: { backgroundColor: colors.backgroundCard, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1, borderColor: colors.cardBorder },
    pathProgress: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: colors.textSecondary },

    timeline: { position: "relative", gap: 0 },
    timelineLine: { position: "absolute", top: 28, bottom: 28, width: 2, overflow: "hidden" },

    tlRow: { alignItems: "center", gap: 12, marginBottom: 14 },
    tlNodeCol: { width: 58, alignItems: "center", justifyContent: "center", position: "relative" },
    tlGlow: { position: "absolute", width: 76, height: 76, borderRadius: 38, left: -9, top: -9, opacity: 0.35 },
    tlNode: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 2.5 },
    tlCard: {
      flex: 1, borderRadius: 18, borderWidth: 1.5, overflow: "hidden", position: "relative",
      ...glassCard,
      ...(isDark ? {} : {
        shadowColor: "#8888CC",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      }),
    },
    tlCardLocked: { opacity: 0.45 },
    tlAccentBar: { position: "absolute", top: 14, bottom: 14, width: 4 },
    tlCardContent: { paddingVertical: 14, gap: 4 },
    tlCardTop: { gap: 6, marginBottom: 2 },
    currentBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    currentBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
    doneBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
    doneBadgeText: { fontSize: 10, fontFamily: "Cairo_700Bold" },
    tlCardTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: colors.text },
    tlCardDesc: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    tlCardMeta: { alignItems: "center", gap: 6, marginTop: 4 },
    tlMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    tlMetaText: { fontSize: 11, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    tlXpText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: colors.gold },
    tlMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted },

    voiceFab: {
      position: "absolute",
      right: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      overflow: "visible",
    },
    voiceFabGrad: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
    voiceFabBadge: { position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },

    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: { backgroundColor: isDark ? colors.backgroundSecondary : colors.backgroundCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderTopColor: colors.cardBorder, maxHeight: "88%", paddingHorizontal: 20, paddingBottom: 40 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: "center", marginTop: 12, marginBottom: 20 },
    sheetHero: { alignItems: "center", gap: 10, marginBottom: 20 },
    sheetIconBg: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    sheetTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: "center" },
    sheetDesc: { fontSize: 14, fontFamily: "Cairo_400Regular", color: colors.textSecondary, textAlign: "center" },
    sheetStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 16, marginBottom: 16, borderRadius: 16, backgroundColor: isDark ? colors.backgroundCard : `${colors.blue}08`, borderWidth: 1, borderColor: colors.border },
    sheetStatItem: { alignItems: "center", gap: 6 },
    sheetStatLabel: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
    sheetStatDivider: { width: 1, height: 32, backgroundColor: colors.border },
    sheetSection: { marginBottom: 16, gap: 10 },
    sheetSectionTitle: { fontSize: 15, fontFamily: "Cairo_700Bold", color: colors.text, textAlign: isRTL ? "right" : "left" },
    skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: isRTL ? "flex-end" : "flex-start" },
    skillPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
    skillPillText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
    tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, marginBottom: 14, backgroundColor: `${colors.gold}10`, borderRadius: 14, borderWidth: 1, borderColor: `${colors.gold}25` },
    tipBoxText: { flex: 1, fontSize: 13, fontFamily: "Cairo_400Regular", color: colors.text, lineHeight: 20, textAlign: isRTL ? "right" : "left" },
    aiBox: { padding: 14, borderRadius: 16, marginBottom: 16, overflow: "hidden", borderWidth: 1, borderColor: `${colors.blue}25` },
    aiBadgeRow: { flexDirection: "row", justifyContent: isRTL ? "flex-end" : "flex-start", marginBottom: 8 },
    aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: `${colors.blue}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
    aiBadgeText: { fontSize: 11, fontFamily: "Cairo_700Bold", color: colors.blueLight },
    aiLoading: { fontSize: 13, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    aiText: { fontSize: 14, fontFamily: "Cairo_400Regular", color: colors.text, lineHeight: 22, textAlign: isRTL ? "right" : "left" },
    sheetActions: { gap: 10, marginTop: 4 },
    mainBtn: { borderRadius: 16, overflow: "hidden" },
    mainBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
    mainBtnText: { fontSize: 16, fontFamily: "Cairo_700Bold", color: "#fff" },
    cancelBtn: { alignItems: "center", paddingVertical: 14 },
    cancelBtnText: { fontSize: 14, fontFamily: "Cairo_600SemiBold", color: colors.textMuted },
  });
}

const vmStyles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  closeBtn: { padding: 4 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, backgroundColor: "rgba(59,130,246,0.15)" },
  aiBadgeText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  micArea: { alignItems: "center", justifyContent: "center", height: 190, marginBottom: 8, position: "relative" },
  ring: { position: "absolute", width: 170, height: 170, borderRadius: 85, borderWidth: 1.5 },
  micBtn: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", zIndex: 10 },
  waveRow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  waveBar: { width: 5, height: 40, borderRadius: 3 },
  phaseLabel: { fontSize: 14, fontFamily: "Cairo_400Regular", textAlign: "center", marginBottom: 16 },
  transcriptBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12, gap: 6 },
  transcriptLabel: { fontSize: 11, fontFamily: "Cairo_400Regular" },
  transcriptText: { fontSize: 15, fontFamily: "Cairo_600SemiBold", lineHeight: 22 },
  responseBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12, overflow: "hidden" },
  responseText: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 22 },
  errorText: { fontSize: 13, fontFamily: "Cairo_400Regular", textAlign: "center", marginBottom: 12 },
  nativeInputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
  nativeInput: { flex: 1, fontSize: 14, fontFamily: "Cairo_400Regular", paddingVertical: 4 },
  nativeSendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resetBtn: { alignItems: "center", paddingVertical: 12, borderTopWidth: 1, marginTop: 4 },
  resetBtnText: { fontSize: 14, fontFamily: "Cairo_600SemiBold" },
  micDeniedBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4 },
  micDeniedText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  micDeniedSub: { fontSize: 12, fontFamily: "Cairo_400Regular" },
  newTabBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center" },
});
