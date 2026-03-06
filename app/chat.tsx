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
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { GridBackground } from "@/components/GridBackground";
import { getApiUrl } from "@/lib/query-client";

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: number;
}

let counter = 0;
function uid(): string {
  counter++;
  return `m-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 6)}`;
}

const WELCOME_AR = "مرحباً! أنا نطق AI، مساعدك الذكي. يمكنني الإجابة على أسئلتك ومساعدتك في أي شيء. بماذا أستطيع أن أساعدك اليوم؟";
const WELCOME_EN = "Hi there! I'm Nutq AI, your smart assistant. I can answer your questions and help with anything you need. What can I help you with today?";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { language, userId, profile, addPoints } = useApp();
  const isRTL = language === "ar";

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", text: isRTL ? WELCOME_AR : WELCOME_EN, role: "assistant", timestamp: Date.now() },
  ]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const c = useStyles(colors, isDark);

  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? inputText).trim();
    if (!text || isStreaming) return;

    const capturedMessages = [...messages];
    const userMsg: Message = { id: uid(), text, role: "user", timestamp: Date.now() };
    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setShowTyping(true);
    setIsStreaming(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = getApiUrl();
      const history = [
        ...capturedMessages.slice().reverse().map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: text },
      ];

      const resp = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: history, mode: "assistant", userId, email: profile.email, name: profile.name }),
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
                  if (arr[0]?.id === aiId) arr[0] = { ...arr[0], text: full };
                  return arr;
                });
              }
            }
          } catch {}
        }
      }
      await addPoints(5);
    } catch {
      setShowTyping(false);
      setMessages((prev) => [
        { id: uid(), text: isRTL ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, something went wrong. Please try again.", role: "assistant", timestamp: Date.now() },
        ...prev,
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [inputText, isStreaming, messages, userId, profile, isRTL, addPoints]);

  const handleMic = useCallback(async () => {
    if (Platform.OS === "web") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setMicError(isRTL ? "المتصفح لا يدعم التعرف الصوتي" : "Browser doesn't support voice input");
        setTimeout(() => setMicError(""), 3000);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = isRTL ? "ar-SA" : "en-US";
      recognition.interimResults = false;
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText((prev) => prev + (prev ? " " : "") + transcript);
      };
      recognition.onerror = () => {
        setMicError(isRTL ? "تعذّر التعرف على الصوت" : "Could not recognize voice");
        setTimeout(() => setMicError(""), 3000);
      };
      recognition.start();
      setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      return;
    }

    if (isRecording) {
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        if (!uri) return;

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

        const baseUrl = getApiUrl();
        const sttResp = await fetch(`${baseUrl}api/stt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, language: isRTL ? "ar" : "en" }),
        });
        if (sttResp.ok) {
          const { text } = await sttResp.json();
          if (text?.trim()) setInputText((prev) => prev + (prev ? " " : "") + text.trim());
        }
      } catch {
        setIsRecording(false);
      }
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setMicError(isRTL ? "الميكروفون محجوب" : "Microphone blocked");
        setTimeout(() => setMicError(""), 3000);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
      setMicError(isRTL ? "تعذّر بدء التسجيل" : "Could not start recording");
      setTimeout(() => setMicError(""), 3000);
    }
  }, [isRecording, isRTL]);

  return (
    <GridBackground style={{ flex: 1 }}>
      {/* ── Header ── */}
      <View style={[c.header, { paddingTop: topInset + 8 }]}>
        <View style={[c.headerRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <View style={[c.titleBlock, { alignItems: isRTL ? "flex-start" : "flex-end" }]}>
            <Text style={[c.title, { textAlign: isRTL ? "left" : "right" }]}>
              {isRTL ? "المساعد الذكي" : "AI Assistant"}
            </Text>
            <Text style={[c.subtitle, { textAlign: isRTL ? "left" : "right" }]}>
              {isRTL ? "تحدث، اسأل، واحصل على مساعدة فورية" : "Talk, ask, and get help instantly"}
            </Text>
          </View>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={({ pressed }) => [c.backBtn, pressed && { opacity: 0.7 }]}
            testID="chat-back-btn"
          >
            <Ionicons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View style={c.headerDivider} />
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={c.list}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={showTyping ? <TypingBubble colors={colors} isDark={isDark} isRTL={isRTL} /> : null}
          renderItem={({ item }) => (
            <Bubble msg={item} colors={colors} isDark={isDark} isRTL={isRTL} />
          )}
        />

        {/* ── Input Area ── */}
        <View style={[c.inputArea, { paddingBottom: botInset + 10 }]}>
          {micError !== "" && (
            <Text style={c.micError}>{micError}</Text>
          )}
          <View style={[c.inputRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            {/* Send */}
            <Pressable
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isStreaming}
              style={({ pressed }) => [c.sendBtn, pressed && { opacity: 0.8 }]}
              testID="chat-send-btn"
            >
              <LinearGradient
                colors={inputText.trim() && !isStreaming ? [colors.blue, colors.purple] : [colors.backgroundCardBorder, colors.backgroundCardBorder]}
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

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[c.textInput, { textAlign: isRTL ? "right" : "left" }]}
              placeholder={isRTL ? "اسأل أي شيء..." : "Ask anything..."}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              blurOnSubmit={false}
              testID="chat-input"
            />

            {/* Mic */}
            <Pressable
              onPress={handleMic}
              style={({ pressed }) => [c.micBtn, isRecording && { backgroundColor: `${colors.error}20`, borderColor: `${colors.error}60` }, pressed && { opacity: 0.7 }]}
              testID="chat-mic-btn"
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic-outline"}
                size={19}
                color={isRecording ? colors.error : colors.textSecondary}
              />
            </Pressable>
          </View>
          <Text style={c.hint}>
            {isRTL ? "كل رسالة = 5 نقاط" : "Every message = 5 points"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </GridBackground>
  );
}

function Bubble({ msg, colors, isDark, isRTL }: { msg: Message; colors: any; isDark: boolean; isRTL: boolean }) {
  const isUser = msg.role === "user";
  const alignStyle = isUser
    ? (isRTL ? { alignItems: "flex-start" as const } : { alignItems: "flex-end" as const })
    : (isRTL ? { alignItems: "flex-end" as const } : { alignItems: "flex-start" as const });

  return (
    <View style={[bs.row, alignStyle]}>
      <View style={[
        bs.bubble,
        isUser ? bs.userBubble : [bs.aiBubble, {
          backgroundColor: isDark ? colors.backgroundCard : "#FFFFFF",
          borderColor: isDark ? colors.border : colors.cardBorder,
        }],
      ]}>
        {isUser && (
          <LinearGradient
            colors={[colors.blue, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
        )}
        <Text style={[bs.text, { color: isUser ? "#fff" : colors.text, textAlign: isRTL ? "right" : "left" }]}>
          {msg.text}
        </Text>
      </View>
    </View>
  );
}

function TypingBubble({ colors, isDark, isRTL }: { colors: any; isDark: boolean; isRTL: boolean }) {
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

  const alignStyle = isRTL ? { alignItems: "flex-end" as const } : { alignItems: "flex-start" as const };

  return (
    <View style={[bs.row, alignStyle]}>
      <View style={[bs.bubble, bs.aiBubble, {
        paddingVertical: 14, paddingHorizontal: 20,
        backgroundColor: isDark ? colors.backgroundCard : "#fff",
        borderColor: isDark ? colors.border : colors.cardBorder,
      }]}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <Animated.View style={[bs.dot, { backgroundColor: colors.blue }, s1]} />
          <Animated.View style={[bs.dot, { backgroundColor: colors.purple }, s2]} />
          <Animated.View style={[bs.dot, { backgroundColor: colors.blue }, s3]} />
        </View>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  row: { marginVertical: 2 },
  bubble: { maxWidth: "80%", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  userBubble: { borderBottomLeftRadius: 6 },
  aiBubble: { borderWidth: 1, borderBottomRightRadius: 6 },
  text: { fontSize: 15, fontFamily: "Cairo_400Regular", lineHeight: 24 },
  dot: { width: 7, height: 14, borderRadius: 4 },
});

function useStyles(colors: any, isDark: boolean) {
  const inputBg = isDark ? colors.backgroundCard : "#FFFFFF";
  const areaBg = isDark ? colors.backgroundSecondary : colors.backgroundCard;

  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingBottom: 0,
    },
    headerRow: {
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 14,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 22,
      fontFamily: "Cairo_700Bold",
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: "Cairo_400Regular",
      color: colors.textSecondary,
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
    headerDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    list: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 2,
    },
    inputArea: {
      paddingHorizontal: 14,
      paddingTop: 12,
      backgroundColor: areaBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    inputRow: {
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
    sendBtn: {
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 4,
    },
    sendGrad: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
    micBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isDark ? colors.backgroundCardBorder : colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    micError: {
      fontSize: 12,
      fontFamily: "Cairo_400Regular",
      color: colors.error,
      textAlign: "center",
      paddingBottom: 4,
    },
    hint: {
      fontSize: 11,
      fontFamily: "Cairo_400Regular",
      color: colors.textMuted,
      textAlign: "center",
    },
  });
}
