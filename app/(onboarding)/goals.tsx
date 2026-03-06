import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";

const GOALS = [
  { id: "skills", icon: "rocket-outline", label: "تطوير مهاراتي", sublabel: "تعزيز القدرات المهنية" },
  { id: "university", icon: "school-outline", label: "دعم جامعي", sublabel: "للطلاب والأكاديميين" },
  { id: "english", icon: "globe-outline", label: "تحسين الإنجليزية", sublabel: "التحدث بطلاقة" },
  { id: "professional", icon: "briefcase-outline", label: "تطوير مهني", sublabel: "للبيئة الوظيفية" },
  { id: "ai", icon: "hardware-chip-outline", label: "تعلم الذكاء الاصطناعي", sublabel: "مواكبة التقنية" },
  { id: "custom", icon: "create-outline", label: "هدف مخصص", sublabel: "حدد هدفك بنفسك" },
];

const LEVELS = [
  { id: "beginner", label: "مبتدئ", sublabel: "أبدأ من الصفر", color: Colors.success },
  { id: "intermediate", label: "متوسط", sublabel: "لدي معرفة أساسية", color: Colors.gold },
  { id: "advanced", label: "متقدم", sublabel: "أريد الاحتراف", color: Colors.purple },
];

const TIMES = [
  { id: 5, label: "5 دقائق", sublabel: "خفيف" },
  { id: 10, label: "10 دقائق", sublabel: "معتدل" },
  { id: 15, label: "15 دقيقة", sublabel: "منتظم" },
  { id: 30, label: "30 دقيقة", sublabel: "مكثف" },
];

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedTime, setSelectedTime] = useState(15);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  async function handleGoalSelect(id: string) {
    setSelectedGoal(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleNext() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 2) {
      setStep(step + 1);
    } else {
      await completeOnboarding(selectedGoal, selectedLevel, selectedTime);
      router.replace("/(tabs)");
    }
  }

  const progress = ((step + 1) / 3) * 100;
  const canContinue =
    (step === 0 && selectedGoal) ||
    (step === 1 && selectedLevel) ||
    step === 2;

  return (
    <GridBackground style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: topInset, paddingBottom: botInset }]}>
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            >
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.stepText}>{step + 1} / 3</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {step === 0 && (
            <StepGoals
              selectedGoal={selectedGoal}
              onSelect={handleGoalSelect}
            />
          )}
          {step === 1 && (
            <StepLevel
              selectedLevel={selectedLevel}
              onSelect={(id) => {
                setSelectedLevel(id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          )}
          {step === 2 && (
            <StepTime
              selectedTime={selectedTime}
              onSelect={(t) => {
                setSelectedTime(t);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleNext}
            disabled={!canContinue}
            style={({ pressed }) => [styles.nextBtn, !canContinue && styles.nextBtnDisabled, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={canContinue ? [Colors.blue, Colors.purple] : [Colors.backgroundCard, Colors.backgroundCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGrad}
            >
              <Text style={[styles.nextBtnText, !canContinue && styles.nextBtnTextDisabled]}>
                {step === 2 ? "ابدأ رحلتك" : "التالي"}
              </Text>
              {step === 2 ? (
                <Ionicons name="rocket-outline" size={18} color={canContinue ? "#fff" : Colors.textMuted} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={canContinue ? "#fff" : Colors.textMuted} />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </GridBackground>
  );
}

function StepGoals({ selectedGoal, onSelect }: { selectedGoal: string; onSelect: (id: string) => void }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>ما هو هدفك التعليمي؟</Text>
      <Text style={stepStyles.subtitle}>اختر الهدف الذي يناسبك</Text>
      <View style={stepStyles.grid}>
        {GOALS.map((goal) => (
          <Pressable
            key={goal.id}
            onPress={() => onSelect(goal.id)}
            style={({ pressed }) => [
              stepStyles.goalCard,
              selectedGoal === goal.id && stepStyles.goalCardSelected,
              pressed && { opacity: 0.8 },
            ]}
          >
            {selectedGoal === goal.id && (
              <LinearGradient
                colors={[`${Colors.blue}20`, `${Colors.purple}20`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <View style={[stepStyles.goalIcon, selectedGoal === goal.id && stepStyles.goalIconSelected]}>
              <Ionicons
                name={goal.icon as any}
                size={22}
                color={selectedGoal === goal.id ? Colors.blue : Colors.textSecondary}
              />
            </View>
            <Text style={[stepStyles.goalLabel, selectedGoal === goal.id && stepStyles.goalLabelSelected]}>
              {goal.label}
            </Text>
            <Text style={stepStyles.goalSublabel}>{goal.sublabel}</Text>
            {selectedGoal === goal.id && (
              <View style={stepStyles.checkmark}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.blue} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepLevel({ selectedLevel, onSelect }: { selectedLevel: string; onSelect: (id: string) => void }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>ما هو مستواك الحالي؟</Text>
      <Text style={stepStyles.subtitle}>سنخصص المحتوى وفق مستواك</Text>
      <View style={stepStyles.levelList}>
        {LEVELS.map((level) => (
          <Pressable
            key={level.id}
            onPress={() => onSelect(level.id)}
            style={({ pressed }) => [
              stepStyles.levelCard,
              selectedLevel === level.id && { ...stepStyles.levelCardSelected, borderColor: level.color },
              pressed && { opacity: 0.8 },
            ]}
          >
            {selectedLevel === level.id && (
              <LinearGradient
                colors={[`${level.color}15`, `${level.color}05`]}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[stepStyles.levelDot, { backgroundColor: level.color }]} />
            <View style={stepStyles.levelInfo}>
              <Text style={[stepStyles.levelLabel, selectedLevel === level.id && { color: level.color }]}>
                {level.label}
              </Text>
              <Text style={stepStyles.levelSublabel}>{level.sublabel}</Text>
            </View>
            {selectedLevel === level.id && (
              <Ionicons name="checkmark-circle" size={22} color={level.color} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function StepTime({ selectedTime, onSelect }: { selectedTime: number; onSelect: (t: number) => void }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>كم دقيقة يومياً؟</Text>
      <Text style={stepStyles.subtitle}>الاستمرارية هي المفتاح</Text>
      <View style={stepStyles.timeGrid}>
        {TIMES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            style={({ pressed }) => [
              stepStyles.timeCard,
              selectedTime === t.id && stepStyles.timeCardSelected,
              pressed && { opacity: 0.8 },
            ]}
          >
            {selectedTime === t.id && (
              <LinearGradient
                colors={[Colors.blue, Colors.purple]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
            <Text style={[stepStyles.timeValue, selectedTime === t.id && stepStyles.timeValueSelected]}>
              {t.label}
            </Text>
            <Text style={[stepStyles.timeSublabel, selectedTime === t.id && { color: "rgba(255,255,255,0.7)" }]}>
              {t.sublabel}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  stepText: { fontSize: 13, fontFamily: "Cairo_600SemiBold", color: Colors.textSecondary },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 20 },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  backBtn: {
    width: 52,
    height: 56,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  nextBtnDisabled: { shadowOpacity: 0, elevation: 0 },
  nextBtnGrad: {
    paddingVertical: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
  },
  nextBtnText: { fontSize: 17, fontFamily: "Cairo_700Bold", color: "#fff" },
  nextBtnTextDisabled: { color: Colors.textMuted },
});

const stepStyles = StyleSheet.create({
  container: { paddingTop: 8, gap: 20 },
  title: { fontSize: 26, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  subtitle: { fontSize: 14, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right", marginTop: -12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  goalCard: {
    width: "47%",
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
    overflow: "hidden",
  },
  goalCardSelected: { borderColor: Colors.blue },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  goalIconSelected: { backgroundColor: `${Colors.blue}20` },
  goalLabel: { fontSize: 14, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  goalLabelSelected: { color: Colors.blueLight },
  goalSublabel: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textMuted, textAlign: "right" },
  checkmark: { position: "absolute", top: 10, left: 10 },
  levelList: { gap: 12 },
  levelCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
  },
  levelCardSelected: { borderColor: Colors.blue },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 16, fontFamily: "Cairo_700Bold", color: Colors.text, textAlign: "right" },
  levelSublabel: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary, textAlign: "right" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  timeCard: {
    width: "47%",
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    aspectRatio: 1.2,
    justifyContent: "center",
  },
  timeCardSelected: { borderColor: Colors.blue },
  timeValue: { fontSize: 17, fontFamily: "Cairo_700Bold", color: Colors.text },
  timeValueSelected: { color: "#fff" },
  timeSublabel: { fontSize: 13, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
});
