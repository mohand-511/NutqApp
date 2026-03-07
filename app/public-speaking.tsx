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

const PS_COMPLETED_KEY = "ps_completed_stages_v1";
const PS_LEVEL_KEY = "ps_user_level_v1";

type UserLevel = "unknown" | "Beginner" | "Intermediate" | "Advanced";

interface SpeakingStage {
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
  return `ps-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 6)}`;
}

const SPEAKING_STAGES: SpeakingStage[] = [
  { id: 1, title: "Standing Before an Audience", icon: "person-outline", color: "#2563EB", category: "Foundations", task: "Record yourself saying: 'Hello, my name is [name] and I am here to grow as a speaker.'" },
  { id: 2, title: "Overcoming Fear of Speaking", icon: "shield-outline", color: "#2563EB", category: "Foundations", task: "Share your biggest fear about public speaking in one clear sentence." },
  { id: 3, title: "Managing Stage Anxiety", icon: "pulse-outline", color: "#2563EB", category: "Foundations", task: "Practice the 4-7-8 breathing technique, then describe how it makes you feel." },
  { id: 4, title: "Creating a Strong Opening", icon: "flash-outline", color: "#2563EB", category: "Foundations", task: "Record a 15-second opening statement for any topic of your choice." },
  { id: 5, title: "Organizing Ideas Clearly", icon: "list-outline", color: "#2563EB", category: "Foundations", task: "Give the coach a 3-point outline for a 1-minute talk on your favorite topic." },
  { id: 6, title: "Basic Body Language", icon: "body-outline", color: "#2563EB", category: "Foundations", task: "Record yourself standing straight and speaking confidently for 20 seconds." },
  { id: 7, title: "Using Hand Gestures", icon: "hand-right-outline", color: "#2563EB", category: "Foundations", task: "Practice 3 hand gestures while talking. Record a 20-second clip and describe it." },
  { id: 8, title: "Eye Contact Techniques", icon: "eye-outline", color: "#2563EB", category: "Foundations", task: "Record yourself maintaining eye contact with the camera for 30 seconds." },
  { id: 9, title: "Controlling Voice Tone", icon: "musical-note-outline", color: "#2563EB", category: "Foundations", task: "Record your voice at 3 different tones. Describe which one sounds most confident." },
  { id: 10, title: "Speaking Clearly", icon: "mic-outline", color: "#2563EB", category: "Foundations", task: "Read a short paragraph aloud clearly. Record it and describe what you notice." },
  { id: 11, title: "Storytelling in Speeches", icon: "book-outline", color: "#7C3AED", category: "Core Skills", task: "Tell a 30-second personal story with a clear beginning, middle, and end." },
  { id: 12, title: "Persuasion Techniques", icon: "megaphone-outline", color: "#7C3AED", category: "Core Skills", task: "Convince the coach of one idea or opinion in under 40 seconds." },
  { id: 13, title: "Explaining Complex Ideas", icon: "bulb-outline", color: "#7C3AED", category: "Core Skills", task: "Explain a technical topic in simple words as if to a 10-year-old." },
  { id: 14, title: "Managing Presentation Time", icon: "timer-outline", color: "#7C3AED", category: "Core Skills", task: "Deliver a 60-second talk without going over or under by more than 5 seconds." },
  { id: 15, title: "Engaging the Audience", icon: "people-outline", color: "#7C3AED", category: "Core Skills", task: "Start a talk with a question or story that hooks the audience. Record it." },
  { id: 16, title: "Handling Questions Confidently", icon: "help-circle-outline", color: "#7C3AED", category: "Core Skills", task: "Answer 2 surprise questions from the coach without a long pause." },
  { id: 17, title: "Ending a Presentation Strongly", icon: "flag-outline", color: "#7C3AED", category: "Core Skills", task: "Record a 20-second closing statement with a clear call to action." },
  { id: 18, title: "Delivering a Short Speech", icon: "chatbox-outline", color: "#7C3AED", category: "Core Skills", task: "Deliver a complete 30-second speech on any topic with intro and conclusion." },
  { id: 19, title: "The One-Minute Speech", icon: "time-outline", color: "#7C3AED", category: "Core Skills", task: "Deliver a complete 60-second speech with intro, body, and conclusion." },
  { id: 20, title: "The Three-Minute Speech", icon: "hourglass-outline", color: "#7C3AED", category: "Core Skills", task: "Deliver a structured 3-minute speech. Focus on pacing, clarity, and flow." },
  { id: 21, title: "Using Slides Effectively", icon: "easel-outline", color: "#0891B2", category: "Practice Methods", task: "Name and explain 3 rules for great slide design in under 30 seconds." },
  { id: 22, title: "Avoiding Reading from Slides", icon: "eye-off-outline", color: "#0891B2", category: "Practice Methods", task: "Present a topic for 30 seconds without glancing at any notes or slides." },
  { id: 23, title: "Practicing with Camera", icon: "videocam-outline", color: "#0891B2", category: "Practice Methods", task: "Record a 1-minute presentation, watch it back, then share your self-critique." },
  { id: 24, title: "Practicing in a Mirror", icon: "swap-horizontal-outline", color: "#0891B2", category: "Practice Methods", task: "Practice 30 seconds of speech focusing on facial expressions and eye contact." },
  { id: 25, title: "Self-Performance Analysis", icon: "analytics-outline", color: "#0891B2", category: "Practice Methods", task: "Describe your top 2 strengths and 1 weakness as a public speaker." },
  { id: 26, title: "Building Stage Presence", icon: "star-outline", color: "#0891B2", category: "Practice Methods", task: "Walk into frame, pause for 2 seconds confidently, then begin speaking." },
  { id: 27, title: "Controlling Speaking Speed", icon: "speedometer-outline", color: "#0891B2", category: "Practice Methods", task: "Read the same paragraph at slow, medium, and fast speeds. Compare each." },
  { id: 28, title: "Eliminating Filler Words", icon: "close-circle-outline", color: "#0891B2", category: "Practice Methods", task: "Speak for 30 seconds without using 'um', 'uh', 'like', or 'you know'." },
  { id: 29, title: "Improving Pronunciation", icon: "text-outline", color: "#0891B2", category: "Practice Methods", task: "Practice 5 commonly mispronounced words. Record and repeat each one." },
  { id: 30, title: "Breath Control While Speaking", icon: "cloud-outline", color: "#0891B2", category: "Practice Methods", task: "Speak a full paragraph without taking a noticeable breath mid-sentence." },
  { id: 31, title: "Building a Full Speech", icon: "document-text-outline", color: "#10B981", category: "Advanced Delivery", task: "Outline and deliver a complete 2-minute speech from scratch on any topic." },
  { id: 32, title: "Delivering an Inspiring Story", icon: "heart-outline", color: "#10B981", category: "Advanced Delivery", task: "Share a personal or inspiring story that moves the audience emotionally." },
  { id: 33, title: "Presenting a Project Idea", icon: "rocket-outline", color: "#10B981", category: "Advanced Delivery", task: "Pitch your project idea in 60 seconds. Include the problem and your solution." },
  { id: 34, title: "Teaching a Concept Clearly", icon: "school-outline", color: "#10B981", category: "Advanced Delivery", task: "Teach one concept you know well to the coach in under 2 minutes." },
  { id: 35, title: "Persuasive Presentation", icon: "thumbs-up-outline", color: "#10B981", category: "Advanced Delivery", task: "Persuade the coach to agree with your opinion on any topic you choose." },
  { id: 36, title: "Motivational Speech Training", icon: "flame-outline", color: "#10B981", category: "Advanced Delivery", task: "Deliver a 60-second motivational speech to inspire someone going through a hard time." },
  { id: 37, title: "Stage Simulation Practice", icon: "layers-outline", color: "#10B981", category: "Advanced Delivery", task: "Simulate giving a full talk to an imaginary audience. Describe the experience." },
  { id: 38, title: "Real Audience Simulation", icon: "people-circle-outline", color: "#10B981", category: "Advanced Delivery", task: "Present to 3 imaginary audience members with different reactions. Adapt live." },
  { id: 39, title: "Final Public Speaking Test", icon: "trophy-outline", color: "#10B981", category: "Advanced Delivery", task: "Deliver a polished 3-minute speech demonstrating all skills you have learned." },
  { id: 40, title: "Graduation: Professional Presentation", icon: "ribbon-outline", color: "#10B981", category: "Advanced Delivery", task: "Give a full professional presentation of 3-5 minutes on any topic you choose." },
];

export default function PublicSpeakingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { addPoints } = useApp();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [userLevel, setUserLevel] = useState<UserLevel>("unknown");
  const [selectedStage, setSelectedStage] = useState<SpeakingStage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [comp, lvl] = await Promise.all([
          AsyncStorage.getItem(PS_COMPLETED_KEY),
          AsyncStorage.getItem(PS_LEVEL_KEY),
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
    await AsyncStorage.setItem(PS_COMPLETED_KEY, JSON.stringify(next));
    addPoints(20);
  }, [completedStages, addPoints]);

  const handleLevelUpdate = useCallback(async (lvl: UserLevel) => {
    setUserLevel(lvl);
    await AsyncStorage.setItem(PS_LEVEL_KEY, lvl);
  }, []);

  const unlockedUpTo = completedStages.length + 1;

  const s = styles(colors, isDark);

  const renderStage = ({ item, index }: { item: SpeakingStage; index: number }) => {
    const isCompleted = completedStages.includes(item.id);
    const isUnlocked = item.id <= unlockedUpTo;
    const isActive = item.id === unlockedUpTo;
    const prevCategory = index > 0 ? SPEAKING_STAGES[index - 1].category : null;
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
                <View style={[s.activeBadge, { backgroundColor: "#10B98122", borderColor: "#10B98140" }]}>
                  <Text style={[s.activeBadgeText, { color: "#10B981" }]}>Done</Text>
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
          <Text style={[s.headerTitle, { color: colors.text }]}>Public Speaking</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>40 Stages · AI Coach</Text>
        </View>
        {userLevel !== "unknown" && (
          <View style={[s.levelBadge, { backgroundColor: `${colors.blue}22`, borderColor: `${colors.blue}40` }]}>
            <Text style={[s.levelBadgeText, { color: colors.blue }]}>{userLevel}</Text>
          </View>
        )}
        {userLevel === "unknown" && <View style={{ width: 60 }} />}
      </View>

      <View style={[s.progressBar, { borderColor: colors.cardBorder }]}>
        <LinearGradient
          colors={[colors.blue, colors.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 4 }]}
        />
        <View style={[s.progressFill, {
          width: `${Math.max(2, (completedStages.length / SPEAKING_STAGES.length) * 100)}%`,
          backgroundColor: "transparent",
        }]} />
        <Text style={s.progressText}>{completedStages.length}/{SPEAKING_STAGES.length} completed</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.blue} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={SPEAKING_STAGES}
          keyExtractor={(item) => `stage-${item.id}`}
          renderItem={renderStage}
          contentContainerStyle={[s.listContent, { paddingBottom: botInset + 24 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedStage && (
        <StageCoachModal
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

function StageCoachModal({
  stage,
  userLevel,
  isCompleted,
  colors,
  isDark,
  onClose,
  onComplete,
  onLevelUpdate,
}: {
  stage: SpeakingStage;
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
        ? [{ role: "user" as const, content: "Hello, I am ready to start this stage." }]
        : [...updatedMessages].reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.text }));

      const voiceNote = isVoiceMsg && wordCount < 4
        ? " [Note: the user's voice recording had very few words — likely quiet or unclear. Include [WEAK_VOICE] in your response.]"
        : "";

      const lastMsg = history[history.length - 1];
      if (voiceNote && lastMsg?.role === "user") {
        history[history.length - 1] = { ...lastMsg, content: lastMsg.content + voiceNote };
      }

      const resp = await fetch(`${baseUrl}api/speaking-coach`, {
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
    const duration = Date.now() - recordingStartRef.current;
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
        body: JSON.stringify({ audio: base64, mimeType: "audio/m4a", language: "en" }),
      });

      if (!sttRes.ok) throw new Error("STT failed");
      const { text } = await sttRes.json();
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      if (!text?.trim()) {
        setWeakVoice(true);
        setMicState("idle");
        return;
      }

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const isWeak = wordCount < 4 && duration > 2000;
      setMicState("idle");
      sendToCoach(text.trim(), false, true, isWeak ? wordCount : 10);
    } catch {
      setMicState("idle");
      Alert.alert("Speech recognition failed. Please try again.");
    }
  }, [sendToCoach]);

  const handleSend = useCallback(() => {
    const t = textInput.trim();
    if (!t || isStreaming) return;
    setTextInput("");
    sendToCoach(t);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [textInput, isStreaming, sendToCoach]);

  const sheetBg = isDark ? "rgba(10,10,28,0.98)" : "rgba(250,250,255,0.98)";

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    const isSpeaking = speakingMsgId === item.id;
    return (
      <View style={[msgStyles.row, isUser ? msgStyles.rowUser : msgStyles.rowAI]}>
        {!isUser && (
          <View style={[msgStyles.avatarCircle, { backgroundColor: `${stage.color}22`, borderColor: `${stage.color}40` }]}>
            <Ionicons name="mic" size={14} color={stage.color} />
          </View>
        )}
        <Pressable
          onPress={() => !isUser && handleBubbleSpeak(item.id, item.text)}
          style={[
            msgStyles.bubble,
            isUser
              ? [msgStyles.bubbleUser, { backgroundColor: colors.blue }]
              : [msgStyles.bubbleAI, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,30,0.05)", borderColor: colors.cardBorder }],
          ]}
        >
          <Text style={[msgStyles.bubbleText, { color: isUser ? "#fff" : colors.text }]}>{item.text}</Text>
          {!isUser && (
            <View style={msgStyles.speakBtn}>
              <Ionicons name={isSpeaking ? "pause" : "volume-medium-outline"} size={13} color={isSpeaking ? stage.color : colors.textMuted} />
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={msgStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          style={[msgStyles.sheet, { backgroundColor: sheetBg, borderTopColor: colors.cardBorder }]}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={[msgStyles.handle, { backgroundColor: colors.cardBorder }]} />

          <View style={msgStyles.modalHeader}>
            <Pressable onPress={onClose} style={msgStyles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <View style={[msgStyles.stageTag, { backgroundColor: `${stage.color}22`, borderColor: `${stage.color}40` }]}>
                <Ionicons name={stage.icon as any} size={12} color={stage.color} />
                <Text style={[msgStyles.stageTagText, { color: stage.color }]}>Stage {stage.id}</Text>
              </View>
              <Text style={[msgStyles.modalTitle, { color: colors.text }]} numberOfLines={1}>{stage.title}</Text>
            </View>
            <Pressable onPress={() => setAutoSpeak((p) => !p)} style={msgStyles.speakerBtn}>
              <Ionicons name={autoSpeak ? "volume-high" : "volume-mute"} size={20} color={autoSpeak ? stage.color : colors.textMuted} />
            </Pressable>
          </View>

          {stageComplete && (
            <View style={[msgStyles.completeBanner, { backgroundColor: "#10B98118", borderColor: "#10B98140" }]}>
              <Ionicons name="trophy" size={16} color="#10B981" />
              <Text style={[msgStyles.completeBannerText, { color: "#10B981" }]}>Stage Complete! Next stage unlocked.</Text>
            </View>
          )}

          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={msgStyles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={showTyping ? (
              <View style={[msgStyles.typingRow]}>
                <View style={[msgStyles.avatarCircle, { backgroundColor: `${stage.color}22`, borderColor: `${stage.color}40` }]}>
                  <Ionicons name="mic" size={14} color={stage.color} />
                </View>
                <View style={[msgStyles.bubble, msgStyles.bubbleAI, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,30,0.05)", borderColor: colors.cardBorder }]}>
                  <ActivityIndicator size="small" color={stage.color} />
                </View>
              </View>
            ) : null}
          />

          {weakVoice && (
            <View style={[msgStyles.weakVoiceBox, { backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.35)" }]}>
              <Ionicons name="volume-low-outline" size={18} color="#F59E0B" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[msgStyles.weakVoiceTitle, { color: colors.text }]}>Voice too quiet?</Text>
                <Text style={[msgStyles.weakVoiceTip, { color: colors.textSecondary }]}>Speak louder, from your diaphragm. Sit upright and breathe deeply first.</Text>
              </View>
              <Pressable
                onPress={() => { setWeakVoice(false); startRecording(); }}
                style={[msgStyles.recordAgainBtn, { backgroundColor: "#F59E0B" }]}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={msgStyles.recordAgainText}>Record Again</Text>
              </Pressable>
            </View>
          )}

          <View style={[msgStyles.inputRow, { borderTopColor: colors.border, paddingBottom: botInset + 8 }]}>
            <Animated.View style={pulseStyle}>
              <Pressable
                onPress={micState === "recording" ? stopRecording : micState === "idle" ? startRecording : undefined}
                disabled={micState === "processing" || isStreaming}
                style={[msgStyles.micBtn, {
                  backgroundColor: micState === "recording" ? "#EF4444" : `${stage.color}22`,
                  borderColor: micState === "recording" ? "#EF4444" : `${stage.color}40`,
                }]}
              >
                {micState === "processing" ? (
                  <ActivityIndicator size="small" color={stage.color} />
                ) : (
                  <Ionicons
                    name={micState === "recording" ? "stop" : "mic"}
                    size={20}
                    color={micState === "recording" ? "#fff" : stage.color}
                  />
                )}
              </Pressable>
            </Animated.View>

            <TextInput
              ref={inputRef}
              style={[msgStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,30,0.04)" }]}
              placeholder="Type your response..."
              placeholderTextColor={colors.textMuted}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isStreaming && micState === "idle"}
              multiline
            />

            <Pressable
              onPress={handleSend}
              disabled={!textInput.trim() || isStreaming || micState !== "idle"}
              style={[msgStyles.sendBtn, {
                backgroundColor: textInput.trim() && !isStreaming ? stage.color : colors.textMuted,
                opacity: textInput.trim() && !isStreaming ? 1 : 0.4,
              }]}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </Pressable>
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
