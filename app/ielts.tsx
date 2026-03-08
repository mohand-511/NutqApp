import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedStyle,
} from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { router } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { getApiUrl } from "@/lib/query-client";

const IELTS_COMPLETED_KEY = "ielts_completed_v1";
const IELTS_LEVEL_KEY = "ielts_level_v1";

type UserLevel = "unknown" | "Beginner" | "Intermediate" | "Advanced";

interface IeltsStage {
  id: number;
  title: string;
  icon: string;
  color: string;
  category: string;
  task: string;
}

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: number;
  isVoice?: boolean;
}

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `ielts-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 6)}`;
}

const IELTS_STAGES: IeltsStage[] = [
  { id: 1, title: "Build Vocabulary Daily", icon: "book-outline", color: "#16A34A", category: "Foundations", task: "Learn 5 IELTS vocabulary words. Use each word in a sentence." },
  { id: 2, title: "Grammar Essentials", icon: "create-outline", color: "#16A34A", category: "Foundations", task: "Write 3 sentences using simple, compound, and complex structures." },
  { id: 3, title: "Listening Introduction", icon: "ear-outline", color: "#16A34A", category: "Foundations", task: "Describe a short conversation you had today. Focus on key details." },
  { id: 4, title: "Self Introduction", icon: "person-outline", color: "#16A34A", category: "Foundations", task: "Introduce yourself as you would in IELTS Speaking Part 1. 30 seconds." },
  { id: 5, title: "Academic Word List", icon: "library-outline", color: "#16A34A", category: "Foundations", task: "Use 5 academic words (analyse, significant, therefore, however, demonstrate) in context." },
  { id: 6, title: "Key Word Identification", icon: "key-outline", color: "#0891B2", category: "Listening", task: "Listen to a short description and identify the 5 most important key words." },
  { id: 7, title: "Note Completion", icon: "document-text-outline", color: "#0891B2", category: "Listening", task: "Listen to a spoken description and fill in 5 missing words from notes." },
  { id: 8, title: "Multiple Choice Practice", icon: "list-outline", color: "#0891B2", category: "Listening", task: "Answer 3 IELTS-style multiple choice questions from a spoken description." },
  { id: 9, title: "Numbers & Dates", icon: "calendar-outline", color: "#0891B2", category: "Listening", task: "Practice recognizing numbers, dates, times, and prices in spoken English." },
  { id: 10, title: "Academic Listening", icon: "school-outline", color: "#0891B2", category: "Listening", task: "Summarize a short academic-style spoken passage in 2-3 sentences." },
  { id: 11, title: "Skimming Technique", icon: "eye-outline", color: "#7C3AED", category: "Reading", task: "Read a short passage in 60 seconds and identify the main topic and purpose." },
  { id: 12, title: "Scanning Practice", icon: "search-outline", color: "#7C3AED", category: "Reading", task: "Find 5 specific facts in a passage as quickly as possible." },
  { id: 13, title: "True / False / Not Given", icon: "checkmark-circle-outline", color: "#7C3AED", category: "Reading", task: "Answer 5 IELTS True/False/Not Given questions and explain your reasoning." },
  { id: 14, title: "Main Idea Identification", icon: "bulb-outline", color: "#7C3AED", category: "Reading", task: "Identify the main idea of 3 different paragraphs and summarize each in one sentence." },
  { id: 15, title: "Heading Matching", icon: "swap-vertical-outline", color: "#7C3AED", category: "Reading", task: "Match 4 paragraph headings to their correct paragraphs and justify your choices." },
  { id: 16, title: "Task 1: Pie Chart", icon: "pie-chart-outline", color: "#D97706", category: "Writing", task: "Describe a simple pie chart in 100 words. Include key percentages and comparisons." },
  { id: 17, title: "Task 1: Bar Graph", icon: "bar-chart-outline", color: "#D97706", category: "Writing", task: "Describe a bar graph showing data over time. Include trends and key figures." },
  { id: 18, title: "Task 2: Introduction", icon: "pencil-outline", color: "#D97706", category: "Writing", task: "Write an introduction for this opinion essay: 'Technology has made life more complicated.'" },
  { id: 19, title: "Task 2: Body Paragraphs", icon: "layers-outline", color: "#D97706", category: "Writing", task: "Write 2 body paragraphs with a topic sentence, evidence, and explanation each." },
  { id: 20, title: "Task 2: Conclusion", icon: "flag-outline", color: "#D97706", category: "Writing", task: "Write a conclusion that restates your thesis and gives a final recommendation." },
  { id: 21, title: "Part 1: Personal Questions", icon: "chatbubble-outline", color: "#DC2626", category: "Speaking", task: "Answer 5 IELTS Part 1 questions about your hobbies, hometown, and daily routine." },
  { id: 22, title: "Part 1: Work & Study", icon: "briefcase-outline", color: "#DC2626", category: "Speaking", task: "Answer IELTS Part 1 questions about your work, studies, and future plans." },
  { id: 23, title: "Part 2: Cue Card", icon: "mic-outline", color: "#DC2626", category: "Speaking", task: "Describe 'a place you would like to visit' for 2 minutes. Cover: where, why, what you'd do." },
  { id: 24, title: "Part 3: Discussion", icon: "people-outline", color: "#DC2626", category: "Speaking", task: "Discuss tourism and travel with deeper IELTS Part 3 questions about society and change." },
  { id: 25, title: "Full Mock Interview", icon: "trophy-outline", color: "#DC2626", category: "Speaking", task: "Complete a full IELTS Speaking mock interview: Part 1 (intro), Part 2 (cue card), Part 3 (discussion)." },
];

export default function IeltsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { addPoints } = useApp();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>("unknown");
  const [selectedStage, setSelectedStage] = useState<IeltsStage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [comp, lvl] = await Promise.all([
          AsyncStorage.getItem(IELTS_COMPLETED_KEY),
          AsyncStorage.getItem(IELTS_LEVEL_KEY),
        ]);
        if (comp) setCompletedStages(JSON.parse(comp));
        if (lvl) setUserLevel(lvl as UserLevel);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleStageComplete = useCallback(async (stageId: number) => {
    const next = [...completedStages, stageId].filter((v, i, a) => a.indexOf(v) === i);
    setCompletedStages(next);
    await AsyncStorage.setItem(IELTS_COMPLETED_KEY, JSON.stringify(next));
    addPoints(20);
  }, [completedStages, addPoints]);

  const handleLevelUpdate = useCallback(async (lvl: UserLevel) => {
    setUserLevel(lvl);
    await AsyncStorage.setItem(IELTS_LEVEL_KEY, lvl);
  }, []);

  const unlockedUpTo = completedStages.length + 1;
  const s = styles(colors, isDark);

  const renderStage = ({ item, index }: { item: IeltsStage; index: number }) => {
    const isCompleted = completedStages.includes(item.id);
    const isUnlocked = item.id <= unlockedUpTo;
    const isActive = item.id === unlockedUpTo;
    const prevCategory = index > 0 ? IELTS_STAGES[index - 1].category : null;
    const showCategoryLabel = item.category !== prevCategory;

    return (
      <View>
        {showCategoryLabel && (
          <View style={s.categoryLabel}>
            <View style={[s.categoryDot, { backgroundColor: item.color }]} />
            <Text style={[s.categoryText, { color: item.color }]}>{item.category}</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            if (!isUnlocked) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedStage(item);
          }}
          style={({ pressed }) => [
            s.stageCard,
            {
              borderColor: isActive
                ? `${item.color}60`
                : isCompleted
                ? `${item.color}30`
                : colors.cardBorder,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {(isActive || isCompleted) && (
            <LinearGradient
              colors={isCompleted ? [`${item.color}12`, `${item.color}06`] : [`${item.color}18`, `${item.color}08`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
          )}
          <View style={s.stageLeft}>
            <View style={[s.stageIconCircle, {
              backgroundColor: isUnlocked ? `${item.color}22` : `${colors.textMuted}14`,
              borderColor: isUnlocked ? `${item.color}40` : `${colors.textMuted}20`,
            }]}>
              <Ionicons
                name={isCompleted ? "checkmark" : isUnlocked ? (item.icon as any) : "lock-closed-outline"}
                size={20}
                color={isCompleted ? item.color : isUnlocked ? item.color : colors.textMuted}
              />
            </View>
          </View>
          <View style={s.stageMid}>
            <View style={s.stageNumRow}>
              <Text style={[s.stageNum, { color: isUnlocked ? item.color : colors.textMuted }]}>
                Stage {item.id}
              </Text>
              {isActive && (
                <View style={[s.activeBadge, { backgroundColor: `${item.color}22`, borderColor: `${item.color}40` }]}>
                  <Text style={[s.activeBadgeText, { color: item.color }]}>Current</Text>
                </View>
              )}
              {isCompleted && (
                <View style={[s.activeBadge, { backgroundColor: "#16A34A22", borderColor: "#16A34A40" }]}>
                  <Text style={[s.activeBadgeText, { color: "#16A34A" }]}>Done</Text>
                </View>
              )}
            </View>
            <Text style={[s.stageTitle, { color: isUnlocked ? colors.text : colors.textMuted }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isUnlocked ? colors.textMuted : `${colors.textMuted}50`}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <GridBackground />
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>IELTS Training</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>25 Stages · Lia AI Tutor</Text>
        </View>
        {userLevel !== "unknown" && (
          <View style={[s.levelBadge, { backgroundColor: "#16A34A22", borderColor: "#16A34A40" }]}>
            <Text style={[s.levelBadgeText, { color: "#16A34A" }]}>{userLevel}</Text>
          </View>
        )}
        {userLevel === "unknown" && <View style={{ width: 60 }} />}
      </View>

      <View style={[s.progressBar, { borderColor: colors.cardBorder }]}>
        <LinearGradient
          colors={["#16A34A", "#0891B2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
        />
        <View style={[s.progressFill, {
          width: `${Math.max(2, (completedStages.length / IELTS_STAGES.length) * 100)}%`,
          backgroundColor: "transparent",
        }]} />
        <Text style={s.progressText}>{completedStages.length}/{IELTS_STAGES.length} completed</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#16A34A" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={IELTS_STAGES}
          keyExtractor={(item) => `ielts-${item.id}`}
          renderItem={renderStage}
          contentContainerStyle={[s.listContent, { paddingBottom: botInset + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedStage && (
        <IeltsCoachModal
          stage={selectedStage}
          userLevel={userLevel}
          isCompleted={completedStages.includes(selectedStage.id)}
          colors={colors}
          isDark={isDark}
          onClose={() => setSelectedStage(null)}
          onComplete={handleStageComplete}
          onLevelUpdate={handleLevelUpdate}
        />
      )}
    </View>
  );
}

function IeltsCoachModal({
  stage,
  userLevel,
  isCompleted,
  colors,
  isDark,
  onClose,
  onComplete,
  onLevelUpdate,
}: {
  stage: IeltsStage;
  userLevel: UserLevel;
  isCompleted: boolean;
  colors: any;
  isDark: boolean;
  onClose: () => void;
  onComplete: (id: number) => void;
  onLevelUpdate: (lvl: UserLevel) => void;
}) {
  const insets = useSafeAreaInsets();
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [micState, setMicState] = useState<"idle" | "recording" | "processing">("idle");
  const [weakVoice, setWeakVoice] = useState(false);
  const [stageComplete, setStageComplete] = useState(isCompleted);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartRef = useRef<number>(0);
  const inputRef = useRef<TextInput>(null);

  const pulseAnim = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: pulseAnim.value,
  }));

  useEffect(() => {
    if (micState === "recording") {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1, false
      );
    } else {
      pulseAnim.value = withTiming(1, { duration: 200 });
    }
  }, [micState]);

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    sendToCoach("__init__", true);
  }, []);

  const playTts = useCallback(async (text: string) => {
    if (!autoSpeak) return;
    try {
      await Speech.stop();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      Speech.speak(text.replace(/\[.*?\]/g, "").trim().slice(0, 400), {
        language: "en-US",
        rate: 0.9,
        pitch: 1.05,
        onDone: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
        onStopped: () => setSpeakingMsgId(null),
      });
    } catch {}
  }, [autoSpeak]);

  const handleBubbleSpeak = useCallback(async (msgId: string, text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (speakingMsgId === msgId) {
      await Speech.stop();
      setSpeakingMsgId(null);
      return;
    }
    await Speech.stop();
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    setSpeakingMsgId(msgId);
    Speech.speak(text.replace(/\[.*?\]/g, "").trim(), {
      language: "en-US",
      rate: 0.9,
      onDone: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null),
      onStopped: () => setSpeakingMsgId(null),
    });
  }, [speakingMsgId]);

  const sendToCoach = useCallback(async (userText: string, isInit = false, isVoiceMsg = false, wordCount = 0) => {
    if (isStreaming) return;

    const capturedMessages = messages.slice();
    let updatedMessages = capturedMessages;

    if (!isInit) {
      const userMsg: Message = { id: uid(), text: userText, role: "user", timestamp: Date.now(), isVoice: isVoiceMsg };
      setMessages((prev) => [userMsg, ...prev]);
      updatedMessages = [userMsg, ...capturedMessages];
    }

    setShowTyping(true);
    setIsStreaming(true);
    setWeakVoice(false);

    try {
      const baseUrl = getApiUrl();
      const history = isInit
        ? [{ role: "user" as const, content: "Hello, I am ready to start this IELTS stage." }]
        : [...updatedMessages].reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));

      const voiceNote = isVoiceMsg && wordCount < 4
        ? " [Note: the user's voice recording had very few words — likely quiet or unclear. Include [WEAK_VOICE] in your response.]"
        : "";

      const lastMsg = history[history.length - 1];
      if (voiceNote && lastMsg?.role === "user") {
        history[history.length - 1] = { ...lastMsg, content: lastMsg.content + voiceNote };
      }

      const resp = await fetch(`${baseUrl}api/ielts-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: history,
          stageName: stage.title,
          stageTask: stage.task,
          userLevel,
        }),
      });

      if (!resp.ok) throw new Error("failed");
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("no reader");

      const dec = new TextDecoder();
      let buf = "";
      let full = "";
      let added = false;
      const aiId = uid();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) {
              full += parsed.content;
              if (!added) {
                setShowTyping(false);
                setMessages((prev) => [{ id: aiId, text: full, role: "assistant", timestamp: Date.now() }, ...prev]);
                added = true;
              } else {
                setMessages((prev) => {
                  const arr = [...prev];
                  const idx = arr.findIndex((m) => m.id === aiId);
                  if (idx !== -1) arr[idx] = { ...arr[idx], text: full };
                  return arr;
                });
              }
            }
          } catch {}
        }
      }

      if (full) {
        const displayText = full.replace(/\[WEAK_VOICE\]/g, "").replace(/\[STAGE_COMPLETE\]/g, "").replace(/\[LEVEL:[^\]]+\]/g, "").trim();
        setMessages((prev) => {
          const arr = [...prev];
          const idx = arr.findIndex((m) => m.id === aiId);
          if (idx !== -1) arr[idx] = { ...arr[idx], text: displayText };
          return arr;
        });
        if (full.includes("[WEAK_VOICE]")) setWeakVoice(true);
        if (full.includes("[STAGE_COMPLETE]") && !stageComplete) {
          setStageComplete(true);
          onComplete(stage.id);
        }
        const levelMatch = full.match(/\[LEVEL:(Beginner|Intermediate|Advanced)\]/);
        if (levelMatch) onLevelUpdate(levelMatch[1] as UserLevel);
        setSpeakingMsgId(aiId);
        playTts(displayText);
      }
    } catch {
      setShowTyping(false);
      setMessages((prev) => [{ id: uid(), text: "Connection issue. Please try again.", role: "assistant", timestamp: Date.now() }, ...prev]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [messages, isStreaming, stage, userLevel, stageComplete, onComplete, onLevelUpdate, playTts]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice recording is available on the mobile app.");
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Microphone permission required");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      setMicState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Could not access microphone");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setMicState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) { setMicState("idle"); return; }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const baseUrl = getApiUrl();
      const sttRes = await fetch(`${baseUrl}api/stt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, language: "en" }),
      });
      const sttData = await sttRes.json();
      const transcript = (sttData.text || "").trim();
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;

      setMicState("idle");
      if (transcript) {
        await sendToCoach(transcript, false, true, wordCount);
      }
    } catch {
      setMicState("idle");
    }
  }, [sendToCoach]);

  const handleSend = useCallback(() => {
    const text = textInput.trim();
    if (!text || isStreaming) return;
    setTextInput("");
    inputRef.current?.blur();
    sendToCoach(text);
  }, [textInput, isStreaming, sendToCoach]);

  const sheetBg = isDark ? "#0F1520" : "#F8FAFF";
  const inputBg = isDark ? "#1A2235" : "#F0F4FF";
  const inputBorder = isDark ? "#2A3450" : "#D1D9ED";
  const bubbleAiBg = isDark ? "#1E2535" : "#EEF2FF";

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View style={[msgStyles.overlay]}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[msgStyles.sheet, { backgroundColor: sheetBg, borderColor: isDark ? "#1E2535" : "#E5EBF5" }]}>
            <View style={[msgStyles.handle, { backgroundColor: isDark ? "#2A3450" : "#CBD5E1" }]} />

            <View style={[msgStyles.modalHeader, { borderBottomColor: isDark ? "#1E2535" : "#E5EBF5", borderBottomWidth: 1 }]}>
              <Pressable onPress={onClose} style={msgStyles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
              <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <View style={[msgStyles.stageTag, { backgroundColor: `${stage.color}18`, borderColor: `${stage.color}35` }]}>
                  <Ionicons name={stage.icon as any} size={11} color={stage.color} />
                  <Text style={[msgStyles.stageTagText, { color: stage.color }]}>{stage.category} · Stage {stage.id}</Text>
                </View>
                <Text style={[msgStyles.modalTitle, { color: colors.text }]} numberOfLines={1}>{stage.title}</Text>
              </View>
              <Pressable
                onPress={() => setAutoSpeak((v) => !v)}
                style={msgStyles.speakerBtn}
              >
                <Ionicons name={autoSpeak ? "volume-high" : "volume-mute"} size={20} color={autoSpeak ? "#16A34A" : colors.textMuted} />
              </Pressable>
            </View>

            {stageComplete && (
              <View style={[msgStyles.completeBanner, { backgroundColor: "#16A34A18", borderColor: "#16A34A40" }]}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={[msgStyles.completeBannerText, { color: "#16A34A" }]}>Stage complete! +20 XP earned</Text>
              </View>
            )}

            {weakVoice && (
              <View style={[msgStyles.weakVoiceBox, { backgroundColor: isDark ? "#2A1F00" : "#FFF8E7", borderColor: "#F59E0B55" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[msgStyles.weakVoiceTitle, { color: "#D97706" }]}>Voice too quiet</Text>
                  <Text style={[msgStyles.weakVoiceTip, { color: colors.textSecondary }]}>Speak louder and slower. Use your diaphragm.</Text>
                </View>
                <Pressable
                  onPress={() => { setWeakVoice(false); startRecording(); }}
                  style={[msgStyles.recordAgainBtn, { backgroundColor: "#F59E0B" }]}
                >
                  <Ionicons name="mic" size={13} color="#fff" />
                  <Text style={msgStyles.recordAgainText}>Try Again</Text>
                </Pressable>
              </View>
            )}

            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              inverted
              showsVerticalScrollIndicator={false}
              contentContainerStyle={msgStyles.messageList}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={showTyping ? (
                <View style={[msgStyles.typingRow]}>
                  <View style={[msgStyles.avatarCircle, { backgroundColor: "#16A34A22", borderColor: "#16A34A40" }]}>
                    <Ionicons name="school-outline" size={14} color="#16A34A" />
                  </View>
                  <View style={[msgStyles.bubble, msgStyles.bubbleAI, { backgroundColor: bubbleAiBg, borderColor: inputBorder }]}>
                    <Text style={[msgStyles.bubbleText, { color: colors.textMuted }]}>Lia is thinking…</Text>
                  </View>
                </View>
              ) : null}
              renderItem={({ item }) => (
                <View style={[msgStyles.row, item.role === "user" ? msgStyles.rowUser : msgStyles.rowAI]}>
                  {item.role === "assistant" && (
                    <View style={[msgStyles.avatarCircle, { backgroundColor: "#16A34A22", borderColor: "#16A34A40" }]}>
                      <Ionicons name="school-outline" size={14} color="#16A34A" />
                    </View>
                  )}
                  <Pressable
                    onLongPress={() => item.role === "assistant" && handleBubbleSpeak(item.id, item.text)}
                    style={[
                      msgStyles.bubble,
                      item.role === "user"
                        ? [msgStyles.bubbleUser, { backgroundColor: "#16A34A", borderColor: "transparent" }]
                        : [msgStyles.bubbleAI, { backgroundColor: bubbleAiBg, borderColor: inputBorder }],
                    ]}
                  >
                    <Text style={[msgStyles.bubbleText, { color: item.role === "user" ? "#fff" : colors.text }]}>{item.text}</Text>
                    {item.role === "assistant" && (
                      <Pressable
                        onPress={() => handleBubbleSpeak(item.id, item.text)}
                        style={msgStyles.speakBtn}
                      >
                        <Ionicons
                          name={speakingMsgId === item.id ? "stop-circle-outline" : "volume-medium-outline"}
                          size={14}
                          color={speakingMsgId === item.id ? "#16A34A" : colors.textMuted}
                        />
                      </Pressable>
                    )}
                  </Pressable>
                  {item.role === "user" && item.isVoice && (
                    <Ionicons name="mic-outline" size={13} color={colors.textMuted} style={{ alignSelf: "flex-end", marginBottom: 4 }} />
                  )}
                </View>
              )}
            />

            <View style={[msgStyles.inputRow, { paddingBottom: botInset + 8, borderTopColor: isDark ? "#1E2535" : "#E5EBF5", backgroundColor: sheetBg }]}>
              <Animated.View style={pulseStyle}>
                <Pressable
                  onPress={micState === "recording" ? stopRecording : micState === "idle" ? startRecording : undefined}
                  disabled={isStreaming || micState === "processing"}
                  style={[msgStyles.micBtn, {
                    backgroundColor: micState === "recording" ? "#EF444420" : `${colors.textMuted}12`,
                    borderColor: micState === "recording" ? "#EF4444" : inputBorder,
                  }]}
                >
                  {micState === "processing"
                    ? <ActivityIndicator size="small" color="#16A34A" />
                    : <Ionicons
                        name={micState === "recording" ? "stop" : "mic-outline"}
                        size={20}
                        color={micState === "recording" ? "#EF4444" : colors.textMuted}
                      />
                  }
                </Pressable>
              </Animated.View>

              <TextInput
                ref={inputRef}
                style={[msgStyles.input, { color: colors.text, backgroundColor: inputBg, borderColor: inputBorder }]}
                placeholder="Type your response…"
                placeholderTextColor={colors.textMuted}
                value={textInput}
                onChangeText={setTextInput}
                onSubmitEditing={handleSend}
                editable={!isStreaming}
                returnKeyType="send"
                multiline
              />

              <Pressable
                onPress={handleSend}
                disabled={!textInput.trim() || isStreaming}
                style={[msgStyles.sendBtn, { backgroundColor: textInput.trim() && !isStreaming ? "#16A34A" : `${colors.textMuted}30` }]}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function styles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: { padding: 8 },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 20, fontFamily: "Cairo_700Bold" },
    headerSub: { fontSize: 12, fontFamily: "Cairo_400Regular", marginTop: 1 },
    levelBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
    },
    levelBadgeText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
    progressBar: {
      marginHorizontal: 16,
      marginBottom: 16,
      height: 28,
      borderRadius: 8,
      borderWidth: 1,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    progressFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
    progressText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: "#fff", zIndex: 1 },
    listContent: { paddingHorizontal: 16, gap: 8 },
    categoryLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      marginBottom: 4,
    },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryText: { fontSize: 12, fontFamily: "Cairo_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
    stageCard: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      gap: 12,
      backgroundColor: isDark ? "rgba(20,20,42,0.5)" : "rgba(255,255,255,0.7)",
      overflow: "hidden",
    },
    stageLeft: {},
    stageIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    stageMid: { flex: 1, gap: 3 },
    stageNumRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    stageNum: { fontSize: 11, fontFamily: "Cairo_700Bold" },
    activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 100,
      borderWidth: 1,
    },
    activeBadgeText: { fontSize: 10, fontFamily: "Cairo_600SemiBold" },
    stageTitle: { fontSize: 14, fontFamily: "Cairo_600SemiBold", lineHeight: 20 },
  });
}

const msgStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    minHeight: "75%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  closeBtn: { padding: 6 },
  stageTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 2,
  },
  stageTagText: { fontSize: 11, fontFamily: "Cairo_600SemiBold" },
  modalTitle: { fontSize: 14, fontFamily: "Cairo_700Bold", textAlign: "center" },
  speakerBtn: { padding: 6 },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  completeBannerText: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  messageList: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  typingRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 4 },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAI: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, fontFamily: "Cairo_400Regular", lineHeight: 21 },
  speakBtn: { alignSelf: "flex-end" },
  weakVoiceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  weakVoiceTitle: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  weakVoiceTip: { fontSize: 12, fontFamily: "Cairo_400Regular", lineHeight: 17 },
  recordAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  recordAgainText: { fontSize: 11, fontFamily: "Cairo_600SemiBold", color: "#fff" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    maxHeight: 80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
