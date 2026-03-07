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
  ScrollView,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { fetch } from "expo/fetch";
import { router } from "expo-router";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { LiaAvatar } from "@/components/Avatar";
import { GridBackground } from "@/components/GridBackground";
import { getApiUrl } from "@/lib/query-client";

const STAGES = [
  { id: 1, label: "Greetings", icon: "hand-left-outline", color: "#2563EB" },
  { id: 2, label: "Daily Chat", icon: "sunny-outline", color: "#7C3AED" },
  { id: 3, label: "Questions", icon: "help-circle-outline", color: "#06B6D4" },
  { id: 4, label: "Real Life", icon: "earth-outline", color: "#10B981" },
  { id: 5, label: "Opinions", icon: "chatbubble-ellipses-outline", color: "#F59E0B" },
];

const STAGE_WELCOMES: Record<number, string> = {
  1: "Hi! I'm Lia, your interviewer today. Let's practice for your big day. To start, could you tell me a little bit about yourself?",
  2: "Awesome! Now let's talk about your daily life. What does a typical day look like for you?",
  3: "Great! This phase is about questions. Try asking me something — anything you're curious about!",
  4: "I see! Let's practice a real-life scenario. Imagine you're at a restaurant. How would you order your meal?",
  5: "Great point! Now let's share some opinions. What do you think is the most important skill in life, and why?",
};

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: number;
  isVoice?: boolean;
}

interface PronunciationFeedback {
  wordCount: number;
  rating: 1 | 2 | 3;
  label: string;
}

let counter = 0;
function uid(): string {
  counter++;
  return `t-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 6)}`;
}

function getPronunciationFeedback(text: string): PronunciationFeedback {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  if (wc >= 12) return { wordCount: wc, rating: 3, label: "Excellent" };
  if (wc >= 5) return { wordCount: wc, rating: 2, label: "Good" };
  return { wordCount: wc, rating: 1, label: "Keep practicing" };
}

export default function EnglishTutorScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { addPoints } = useApp();

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const [activeStage, setActiveStage] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", text: STAGE_WELCOMES[1], role: "assistant", timestamp: Date.now() },
  ]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micState, setMicState] = useState<"idle" | "recording" | "processing" | "unavailable">("idle");
  const [micBanner, setMicBanner] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<PronunciationFeedback | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const c = useStyles(colors, isDark);

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {});
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const changeStage = useCallback((stageId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    recordingRef.current = null;
    Speech.stop().catch(() => {});
    setMicState("idle");
    setMicBanner("");
    setSpeakingMsgId(null);
    setActiveStage(stageId);
    setSuggestions([]);
    setPronunciationFeedback(null);
    setIsSpeaking(false);
    setMessages([
      { id: uid(), text: STAGE_WELCOMES[stageId], role: "assistant", timestamp: Date.now() },
    ]);
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
      setIsSpeaking(true);
      Speech.speak(text.slice(0, 500), {
        language: "en-US",
        rate: 0.95,
        pitch: 1.05,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  }, [autoSpeak]);

  const fetchSuggestions = useCallback(async (lastAiText: string, stage: number) => {
    setLoadingSuggestions(true);
    try {
      const baseUrl = getApiUrl();
      const resp = await fetch(`${baseUrl}api/conversation/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastAiMessage: lastAiText, stage }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      setSuggestions(["I understand!", "That's interesting.", "Tell me more!"]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

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
    Speech.speak(text, {
      language: "en-US",
      rate: 0.9,
      onDone: () => setSpeakingMsgId(null),
      onError: () => setSpeakingMsgId(null),
      onStopped: () => setSpeakingMsgId(null),
    });
  }, [speakingMsgId]);

  const sendMessage = useCallback(async (textOverride?: string, isVoiceMsg?: boolean) => {
    const text = (textOverride ?? inputText).trim();
    if (!text || isStreaming) return;

    const capturedMessages = [...messages];
    const userMsg: Message = { id: uid(), text, role: "user", timestamp: Date.now(), isVoice: isVoiceMsg };

    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setSuggestions([]);
    setPronunciationFeedback(null);
    setShowTyping(true);
    setIsStreaming(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = getApiUrl();
      const history = [
        ...capturedMessages.slice().reverse().map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: text },
      ];

      const resp = await fetch(`${baseUrl}api/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: history, stage: activeStage }),
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
                setIsSpeaking(true);
                setMessages((prev) => [{ id: aiId, text: full, role: "assistant", timestamp: Date.now() }, ...prev]);
                added = true;
              } else {
                setMessages((prev) => {
                  const arr = [...prev];
                  if (arr[0]?.id === aiId) arr[0] = { ...arr[0], text: full };
                  return arr;
                });
              }
            }
          } catch {}
        }
      }

      if (full) {
        playTts(full);
        fetchSuggestions(full, activeStage);
      }
      await addPoints(10);
      setTimeout(() => setIsSpeaking(false), 4000);
    } catch {
      setShowTyping(false);
      setMessages((prev) => [
        { id: uid(), text: "Sorry, something went wrong. Please try again!", role: "assistant", timestamp: Date.now() },
        ...prev,
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [inputText, isStreaming, messages, activeStage, addPoints, playTts, fetchSuggestions]);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    try {
      await rec.stopAndUnloadAsync();
    } catch {}

    const uri = rec.getURI();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

    if (!uri) {
      setMicState("idle");
      return;
    }

    setMicState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/webm";
      const baseUrl = getApiUrl();
      const sttResp = await fetch(`${baseUrl}api/stt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType, language: "en" }),
      });

      if (sttResp.status === 503) {
        setMicState("unavailable");
        setMicBanner("Voice transcription unavailable. Type your message below.");
        setTimeout(() => { setMicState("idle"); setMicBanner(""); }, 5000);
        inputRef.current?.focus();
        return;
      }

      if (sttResp.ok) {
        const { text } = await sttResp.json();
        if (text?.trim()) {
          const feedback = getPronunciationFeedback(text.trim());
          setPronunciationFeedback(feedback);
          setMicState("idle");
          sendMessage(text.trim(), true);
          return;
        }
      }

      setMicState("idle");
      setMicBanner("Couldn't hear anything. Try again.");
      setTimeout(() => setMicBanner(""), 3000);
    } catch {
      setMicState("idle");
      setMicBanner("Recording failed. Please try again.");
      setTimeout(() => setMicBanner(""), 3000);
    }
  }, [sendMessage]);

  const handleMic = useCallback(async () => {
    if (isStreaming) return;

    if (Platform.OS === "web") {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setMicBanner("Voice not supported in this browser");
        setTimeout(() => setMicBanner(""), 3000);
        return;
      }
      const recognition = new SR();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      setMicState("recording");
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        const feedback = getPronunciationFeedback(transcript);
        setPronunciationFeedback(feedback);
        setMicState("idle");
        sendMessage(transcript, true);
      };
      recognition.onerror = (e: any) => {
        const msg = e.error === "not-allowed" ? "Microphone permission denied" : "Couldn't hear you. Try again.";
        setMicBanner(msg);
        setTimeout(() => setMicBanner(""), 3000);
        setMicState("idle");
      };
      recognition.onend = () => setMicState((s) => s === "recording" ? "idle" : s);
      recognition.start();
      return;
    }

    if (micState === "recording") {
      await stopRecordingAndTranscribe();
      return;
    }

    if (micState === "processing") return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setMicBanner("Microphone permission denied. Allow it in Settings.");
        setTimeout(() => setMicBanner(""), 4000);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setMicState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      autoStopTimerRef.current = setTimeout(() => {
        stopRecordingAndTranscribe();
      }, 12000);
    } catch {
      setMicState("idle");
      setMicBanner("Could not access microphone.");
      setTimeout(() => setMicBanner(""), 3000);
    }
  }, [micState, isStreaming, sendMessage, stopRecordingAndTranscribe]);

  const stageMeta = STAGES.find((s) => s.id === activeStage)!;

  return (
    <GridBackground style={{ flex: 1 }}>
      <View style={[c.header, { paddingTop: topInset + 8 }]}>
        <View style={c.headerRow}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={({ pressed }) => [c.backBtn, pressed && { opacity: 0.7 }]}
            testID="tutor-back-btn"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={c.headerCenter}>
            <Text style={c.headerTitle}>English Tutor</Text>
            <View style={c.liaStatusRow}>
              <View style={[c.statusDot, {
                backgroundColor: micState === "recording" ? "#EF4444"
                  : micState === "processing" ? "#F59E0B"
                  : isSpeaking || showTyping ? "#10B981"
                  : "#A78BFA"
              }]} />
              <Text style={c.liaStatus}>
                {micState === "recording" ? "Listening... (tap mic to stop)"
                  : micState === "processing" ? "Transcribing..."
                  : showTyping ? "Lia is thinking..."
                  : isSpeaking ? "Lia is speaking..."
                  : "Lia is ready"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              setAutoSpeak((v) => !v);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [c.speakerBtn, autoSpeak && { backgroundColor: "#7C3AED20", borderColor: "#7C3AED60" }, pressed && { opacity: 0.7 }]}
            testID="tutor-speaker-btn"
          >
            <Ionicons name={autoSpeak ? "volume-high" : "volume-mute"} size={18} color={autoSpeak ? "#A78BFA" : colors.textMuted} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={c.stageTabs}>
          {STAGES.map((stage) => (
            <Pressable
              key={stage.id}
              onPress={() => changeStage(stage.id)}
              style={({ pressed }) => [
                c.stageTab,
                activeStage === stage.id && { backgroundColor: `${stage.color}20`, borderColor: `${stage.color}60` },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name={stage.icon as any} size={13} color={activeStage === stage.id ? stage.color : colors.textMuted} />
              <Text style={[c.stageTabText, activeStage === stage.id && { color: stage.color }]}>
                {stage.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={c.avatarArea}>
        <LiaAvatar size={90} speaking={isSpeaking || showTyping} />
        <View style={c.liaInfo}>
          <Text style={c.liaName}>Lia</Text>
          <View style={[c.stageBadge, { backgroundColor: `${stageMeta.color}18`, borderColor: `${stageMeta.color}40` }]}>
            <Ionicons name={stageMeta.icon as any} size={11} color={stageMeta.color} />
            <Text style={[c.stageBadgeText, { color: stageMeta.color }]}>Stage {activeStage}: {stageMeta.label}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={c.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={showTyping ? <TypingBubble colors={colors} isDark={isDark} /> : null}
          renderItem={({ item, index }) => (
            <View>
              <TutorBubble
                msg={item}
                colors={colors}
                isDark={isDark}
                onSpeak={handleBubbleSpeak}
                isPlayingAudio={speakingMsgId === item.id}
              />
              {item.role === "assistant" && index === 0 && !showTyping && (suggestions.length > 0 || loadingSuggestions) && (
                <SuggestionsRow
                  suggestions={suggestions}
                  loading={!!loadingSuggestions}
                  colors={colors}
                  onSelect={(s) => sendMessage(s)}
                />
              )}
            </View>
          )}
        />

        <View style={[c.inputArea, { paddingBottom: botInset + 10 }]}>
          {pronunciationFeedback && (
            <PronunciationCard feedback={pronunciationFeedback} colors={colors} onDismiss={() => setPronunciationFeedback(null)} />
          )}

          {micBanner !== "" && (
            <View style={[c.micBannerRow, micState === "unavailable" && { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
              <Ionicons
                name={micState === "unavailable" ? "warning-outline" : micState === "recording" ? "mic" : "information-circle-outline"}
                size={13}
                color={micState === "unavailable" ? "#F59E0B" : micState === "recording" ? "#EF4444" : colors.textMuted}
              />
              <Text style={[c.micBannerText, micState === "unavailable" && { color: "#F59E0B" }]}>{micBanner}</Text>
            </View>
          )}

          <View style={c.inputRow}>
            <Pressable
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isStreaming}
              style={({ pressed }) => [c.sendBtn, pressed && { opacity: 0.8 }]}
              testID="tutor-send-btn"
            >
              <LinearGradient
                colors={inputText.trim() && !isStreaming ? ["#7C3AED", "#2563EB"] : [colors.backgroundCardBorder, colors.backgroundCardBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={c.sendGrad}
              >
                {isStreaming
                  ? <ActivityIndicator size="small" color={colors.textMuted} />
                  : <Ionicons name="send" size={17} color={inputText.trim() ? "#fff" : colors.textMuted} />
                }
              </LinearGradient>
            </Pressable>

            <TextInput
              ref={inputRef}
              style={c.textInput}
              placeholder={micState === "recording" ? "Listening..." : "Type in English..."}
              placeholderTextColor={micState === "recording" ? "#EF4444" : colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              blurOnSubmit={false}
              testID="tutor-input"
            />

            <Pressable
              onPress={handleMic}
              disabled={micState === "processing" || isStreaming}
              style={({ pressed }) => [
                c.micBtn,
                micState === "recording" && { backgroundColor: "#EF444420", borderColor: "#EF444460" },
                micState === "processing" && { backgroundColor: "#F59E0B20", borderColor: "#F59E0B60" },
                pressed && { opacity: 0.7 },
              ]}
              testID="tutor-mic-btn"
            >
              {micState === "processing"
                ? <ActivityIndicator size="small" color="#F59E0B" />
                : <Ionicons
                    name={micState === "recording" ? "stop-circle" : "mic"}
                    size={20}
                    color={micState === "recording" ? "#EF4444" : "#A78BFA"}
                  />
              }
            </Pressable>
          </View>

          <Text style={c.hint}>
            {micState === "recording" ? "Tap the mic again to stop recording"
              : "Every message = 10 pts  •  Tap mic to speak"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </GridBackground>
  );
}

function TutorBubble({ msg, colors, isDark, onSpeak, isPlayingAudio }: {
  msg: Message; colors: any; isDark: boolean;
  onSpeak: (id: string, text: string) => void;
  isPlayingAudio: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <View style={[tb.row, isUser ? tb.userRow : tb.aiRow]}>
      {!isUser && (
        <View style={[tb.aiIcon, { backgroundColor: "#7C3AED20", borderColor: "#7C3AED40" }]}>
          <Text style={tb.aiIconText}>L</Text>
        </View>
      )}
      <View style={[tb.bubble, isUser ? tb.userBubble : [tb.aiBubble, { backgroundColor: isDark ? colors.backgroundCard : "#FFFFFF", borderColor: isDark ? colors.border : "#E9D5FF" }]]}>
        {isUser && (
          <LinearGradient
            colors={["#7C3AED", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
        )}
        {msg.isVoice && isUser && (
          <View style={tb.voiceTag}>
            <Ionicons name="mic" size={10} color="rgba(255,255,255,0.7)" />
          </View>
        )}
        <Text style={[tb.text, { color: isUser ? "#fff" : colors.text }]}>{msg.text}</Text>
        {!isUser && (
          <Pressable
            onPress={() => onSpeak(msg.id, msg.text)}
            style={({ pressed }) => [tb.speakBtn, isPlayingAudio && tb.speakBtnActive, pressed && { opacity: 0.65 }]}
            hitSlop={8}
          >
            <Ionicons
              name={isPlayingAudio ? "volume-high" : "volume-medium-outline"}
              size={14}
              color={isPlayingAudio ? "#7C3AED" : "#A78BFA"}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SuggestionsRow({ suggestions, loading, colors, onSelect }: { suggestions: string[]; loading: boolean; colors: any; onSelect: (s: string) => void }) {
  if (loading) {
    return (
      <View style={sg.row}>
        <ActivityIndicator size="small" color="#A78BFA" />
      </View>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sg.row} style={sg.scroll}>
      {suggestions.map((s, i) => (
        <Pressable
          key={i}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(s); }}
          style={({ pressed }) => [sg.chip, pressed && { opacity: 0.7 }]}
        >
          <Text style={sg.chipText}>{s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function PronunciationCard({ feedback, colors, onDismiss }: { feedback: PronunciationFeedback; colors: any; onDismiss: () => void }) {
  const stars = feedback.rating;
  const starColor = stars === 3 ? "#10B981" : stars === 2 ? "#F59E0B" : "#EF4444";
  return (
    <View style={[pc.card, { backgroundColor: `${starColor}12`, borderColor: `${starColor}30` }]}>
      <View style={pc.left}>
        <Ionicons name="mic-circle" size={18} color={starColor} />
        <View>
          <Text style={[pc.label, { color: starColor }]}>Pronunciation: {feedback.label}</Text>
          <View style={pc.stars}>
            {[1, 2, 3].map((i) => (
              <Ionicons key={i} name="star" size={12} color={i <= stars ? starColor : "#ccc"} />
            ))}
          </View>
        </View>
      </View>
      <Pressable onPress={onDismiss} style={pc.dismiss}>
        <Ionicons name="close" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function TypingBubble({ colors, isDark }: { colors: any; isDark: boolean }) {
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);
  useEffect(() => {
    d1.value = withRepeat(withSequence(withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
    d2.value = withRepeat(withSequence(withTiming(0.3, { duration: 175 }), withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
    d3.value = withRepeat(withSequence(withTiming(0.3, { duration: 350 }), withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scaleY: 0.5 + d1.value * 0.5 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scaleY: 0.5 + d2.value * 0.5 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scaleY: 0.5 + d3.value * 0.5 }] }));
  return (
    <View style={tb.aiRow}>
      <View style={[tb.aiIcon, { backgroundColor: "#7C3AED20", borderColor: "#7C3AED40" }]}>
        <Text style={tb.aiIconText}>L</Text>
      </View>
      <View style={[tb.bubble, tb.aiBubble, {
        paddingVertical: 14, paddingHorizontal: 20,
        backgroundColor: isDark ? colors.backgroundCard : "#fff",
        borderColor: isDark ? colors.border : "#E9D5FF",
      }]}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <Animated.View style={[{ width: 7, height: 14, borderRadius: 4, backgroundColor: "#A78BFA" }, s1]} />
          <Animated.View style={[{ width: 7, height: 14, borderRadius: 4, backgroundColor: "#7C3AED" }, s2]} />
          <Animated.View style={[{ width: 7, height: 14, borderRadius: 4, backgroundColor: "#A78BFA" }, s3]} />
        </View>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  row: { marginVertical: 3, paddingHorizontal: 16 },
  userRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end" },
  aiRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-start" },
  aiIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 8, marginBottom: 2, flexShrink: 0 },
  aiIconText: { fontSize: 13, fontFamily: "Cairo_700Bold", color: "#A78BFA" },
  bubble: { maxWidth: "78%", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  userBubble: { borderBottomRightRadius: 5 },
  aiBubble: { borderWidth: 1, borderBottomLeftRadius: 5 },
  text: { fontSize: 15, fontFamily: "Cairo_400Regular", lineHeight: 24 },
  voiceTag: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4, opacity: 0.7 },
  speakBtn: { alignSelf: "flex-end", marginTop: 6, padding: 4, borderRadius: 10, backgroundColor: "#7C3AED0D" },
  speakBtnActive: { backgroundColor: "#7C3AED22" },
});

const sg = StyleSheet.create({
  scroll: { marginTop: 6, marginBottom: 4 },
  row: { paddingHorizontal: 52, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: "#7C3AED18",
    borderWidth: 1,
    borderColor: "#7C3AED40",
  },
  chipText: { fontSize: 13, fontFamily: "Cairo_400Regular", color: "#A78BFA" },
});

const pc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 13, fontFamily: "Cairo_600SemiBold" },
  stars: { flexDirection: "row", gap: 2, marginTop: 2 },
  dismiss: { padding: 4 },
});

function useStyles(colors: any, isDark: boolean) {
  const inputBg = isDark ? colors.backgroundCard : "#FFFFFF";
  const areaBg = isDark ? colors.backgroundSecondary : colors.backgroundCard;

  return StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isDark ? colors.backgroundCard : colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: { flex: 1, gap: 2 },
    headerTitle: { fontSize: 20, fontFamily: "Cairo_700Bold", color: colors.text },
    liaStatusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    liaStatus: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    speakerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isDark ? colors.backgroundCard : colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stageTabs: { gap: 8, paddingBottom: 2 },
    stageTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 100,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.backgroundCard : "#FFFFFF",
    },
    stageTabText: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: colors.textMuted },
    avatarArea: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    liaInfo: { gap: 4 },
    liaName: { fontSize: 22, fontFamily: "Cairo_700Bold", color: colors.text },
    stageBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 100,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    stageBadgeText: { fontSize: 12, fontFamily: "Cairo_600SemiBold" },
    messagesList: { paddingVertical: 14, gap: 2 },
    inputArea: {
      paddingHorizontal: 14,
      paddingTop: 10,
      backgroundColor: areaBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      backgroundColor: inputBg,
      borderRadius: 26,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: "Cairo_400Regular",
      color: colors.text,
      maxHeight: 120,
      paddingVertical: 8,
      textAlignVertical: "top",
    },
    sendBtn: { borderRadius: 16, overflow: "hidden", marginBottom: 4 },
    sendGrad: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 16 },
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? "#7C3AED18" : "#F5F3FF",
      borderWidth: 1.5,
      borderColor: isDark ? "#7C3AED40" : "#DDD6FE",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    micBannerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.backgroundCard : "#F8F8FF",
    },
    micBannerText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Cairo_400Regular",
      color: colors.textSecondary,
    },
    hint: {
      fontSize: 11,
      fontFamily: "Cairo_400Regular",
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
