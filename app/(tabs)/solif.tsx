import React, { useState, useRef, useCallback } from "react";
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
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { SaudiAvatar } from "@/components/Avatar";
import { getApiUrl } from "@/lib/query-client";
import { GridBackground } from "@/components/GridBackground";

const CONVERSATION_MODES = [
  { id: "casual", label: "دردشة", icon: "chatbubble-outline", color: Colors.blue },
  { id: "science", label: "علمي", icon: "flask-outline", color: "#06B6D4" },
  { id: "roleplay", label: "أدوار", icon: "people-outline", color: Colors.purple },
  { id: "interview", label: "مقابلة", icon: "briefcase-outline", color: Colors.gold },
];

interface Message {
  id: string;
  text: string;
  role: "user" | "assistant";
  timestamp: number;
}

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    text: "أهلاً وسهلاً! أنا نطق AI، مساعدك الذكي للتعلم والمحادثة. اختر نمط المحادثة الذي يناسبك وابدأ معي!",
    role: "assistant",
    timestamp: Date.now(),
  },
];

export default function SolifScreen() {
  const insets = useSafeAreaInsets();
  const { addPoints } = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [activeMode, setActiveMode] = useState("casual");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const capturedMessages = [...messages];
    const userMsg: Message = {
      id: genId(),
      text,
      role: "user",
      timestamp: Date.now(),
    };

    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setShowTyping(true);
    setIsStreaming(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = getApiUrl();
      const chatHistory = [
        ...capturedMessages
          .slice()
          .reverse()
          .map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: chatHistory, mode: activeMode }),
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let assistantAdded = false;
      const assistantId = genId();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;

              if (!assistantAdded) {
                setShowTyping(false);
                setIsSpeaking(true);
                setMessages((prev) => [
                  { id: assistantId, text: fullContent, role: "assistant", timestamp: Date.now() },
                  ...prev,
                ]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[0]?.id === assistantId) {
                    updated[0] = { ...updated[0], text: fullContent };
                  }
                  return updated;
                });
              }
            }
          } catch {}
        }
      }

      await addPoints(5);
      setTimeout(() => setIsSpeaking(false), 2000);
    } catch (err) {
      setShowTyping(false);
      setMessages((prev) => [
        { id: genId(), text: "عذراً، حدث خطأ. حاول مرة أخرى.", role: "assistant", timestamp: Date.now() },
        ...prev,
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [inputText, isStreaming, messages, activeMode, addPoints]);

  return (
    <GridBackground style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.avatarRow}>
          <View style={styles.statusInfo}>
            <View style={styles.statusDot}>
              <View
                style={[
                  styles.statusDotInner,
                  { backgroundColor: isSpeaking || showTyping ? Colors.success : Colors.textMuted },
                ]}
              />
            </View>
            <View>
              <Text style={styles.headerTitle}>سوالف</Text>
              <Text style={styles.headerSubtitle}>
                {showTyping ? "يفكر..." : isSpeaking ? "يتحدث..." : "نطق AI جاهز"}
              </Text>
            </View>
          </View>
          <SaudiAvatar size={68} speaking={isSpeaking || showTyping} />
        </View>

        <View style={styles.modeRow}>
          {CONVERSATION_MODES.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => {
                setActiveMode(mode.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.modeChip,
                activeMode === mode.id && { borderColor: mode.color },
                pressed && { opacity: 0.75 },
              ]}
            >
              {activeMode === mode.id && (
                <View style={[StyleSheet.absoluteFill, { borderRadius: 100, backgroundColor: `${mode.color}18` }]} />
              )}
              <Ionicons
                name={mode.icon as any}
                size={13}
                color={activeMode === mode.id ? mode.color : Colors.textMuted}
              />
              <Text style={[styles.modeLabel, activeMode === mode.id && { color: mode.color }]}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={showTyping ? <TypingBubble /> : null}
          renderItem={({ item }) => <MessageBubble message={item} />}
        />

        <View style={[styles.inputArea, { paddingBottom: botInset + 8 }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="اكتب رسالتك..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlign="right"
              blurOnSubmit={false}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || isStreaming}
              style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={inputText.trim() && !isStreaming ? [Colors.blue, Colors.purple] : [Colors.backgroundCardBorder, Colors.backgroundCardBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnGrad}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color={Colors.textMuted} />
                ) : (
                  <Ionicons
                    name="send"
                    size={17}
                    color={inputText.trim() ? "#fff" : Colors.textMuted}
                  />
                )}
              </LinearGradient>
            </Pressable>
          </View>
          <Text style={styles.pointsHint}>كل رسالة = 5 نقاط</Text>
        </View>
      </KeyboardAvoidingView>
    </GridBackground>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {isUser && (
          <LinearGradient
            colors={[Colors.blue, Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
          />
        )}
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function TypingBubble() {
  const d1 = useSharedValue(0.3);
  const d2 = useSharedValue(0.3);
  const d3 = useSharedValue(0.3);

  React.useEffect(() => {
    d1.value = withRepeat(withSequence(withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
    d2.value = withRepeat(withSequence(withTiming(0.3, { duration: 175 }), withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
    d3.value = withRepeat(withSequence(withTiming(0.3, { duration: 350 }), withTiming(1, { duration: 350 }), withTiming(0.3, { duration: 350 })), -1, true);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: d1.value, transform: [{ scaleY: 0.5 + d1.value * 0.5 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value, transform: [{ scaleY: 0.5 + d2.value * 0.5 }] }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value, transform: [{ scaleY: 0.5 + d3.value * 0.5 }] }));

  return (
    <View style={styles.aiRow}>
      <View style={[styles.bubble, styles.aiBubble, { paddingVertical: 14, paddingHorizontal: 18 }]}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <Animated.View style={[styles.typingDot, s1]} />
          <Animated.View style={[styles.typingDot, s2]} />
          <Animated.View style={[styles.typingDot, s3]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: { alignItems: "center", justifyContent: "center" },
  statusDotInner: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 22, fontFamily: "Cairo_700Bold", color: Colors.text },
  headerSubtitle: { fontSize: 12, fontFamily: "Cairo_400Regular", color: Colors.textSecondary },
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  modeLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: Colors.textMuted },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  messageRow: { marginVertical: 3 },
  userRow: { alignItems: "flex-start" },
  aiRow: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: "hidden",
  },
  userBubble: { borderBottomLeftRadius: 5 },
  aiBubble: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomRightRadius: 5,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: "right",
  },
  bubbleTextUser: { color: "#fff" },
  typingDot: {
    width: 7,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.blue,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.text,
    maxHeight: 120,
    paddingVertical: 8,
    textAlignVertical: "top",
  },
  sendBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  sendBtnGrad: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  pointsHint: { fontSize: 11, fontFamily: "Cairo_400Regular", color: Colors.textMuted, textAlign: "center" },
});
