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
import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { SaudiAvatar } from "@/components/Avatar";
import { getApiUrl } from "@/lib/query-client";
import { GridBackground } from "@/components/GridBackground";

const CONVERSATION_MODES = [
  { id: "casual", labelAr: "دردشة", labelEn: "Chat", icon: "chatbubble-outline", color: "#2563EB" },
  { id: "science", labelAr: "علمي", labelEn: "Science", icon: "flask-outline", color: "#06B6D4" },
  { id: "roleplay", labelAr: "أدوار", labelEn: "Role", icon: "people-outline", color: "#7C3AED" },
  { id: "interview", labelAr: "مقابلة", labelEn: "Interview", icon: "briefcase-outline", color: "#F59E0B" },
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
  const { colors, isDark } = useTheme();
  const { addPoints, language, userId, profile } = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [activeMode, setActiveMode] = useState("casual");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isRTL = language === "ar";
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    const capturedMessages = [...messages];
    const userMsg: Message = { id: genId(), text, role: "user", timestamp: Date.now() };

    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setShowTyping(true);
    setIsStreaming(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = getApiUrl();
      const chatHistory = [
        ...capturedMessages.slice().reverse().map((m) => ({ role: m.role, content: m.text })),
        { role: "user" as const, content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: chatHistory, mode: activeMode, userId, email: profile.email, name: profile.name }),
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
    } catch {
      setShowTyping(false);
      setMessages((prev) => [
        { id: genId(), text: isRTL ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, an error occurred. Please try again.", role: "assistant", timestamp: Date.now() },
        ...prev,
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [inputText, isStreaming, messages, activeMode, addPoints, isRTL]);

  const activeModeMeta = CONVERSATION_MODES.find((m) => m.id === activeMode)!;

  return (
    <GridBackground style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles(colors, isDark).header, { paddingTop: topInset + 10 }]}>
        <View style={[styles(colors, isDark).avatarRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
          <View style={[styles(colors, isDark).statusInfo, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <SaudiAvatar size={60} speaking={isSpeaking || showTyping} />
            <View>
              <Text style={[styles(colors, isDark).headerTitle, { textAlign: isRTL ? "right" : "left" }]}>
                {isRTL ? "سوالف" : "Solif"}
              </Text>
              <View style={[styles(colors, isDark).statusRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
                <View style={[styles(colors, isDark).statusDotOuter, { backgroundColor: showTyping || isSpeaking ? `${colors.success}30` : `${colors.textMuted}20` }]}>
                  <View style={[styles(colors, isDark).statusDotInner, { backgroundColor: showTyping || isSpeaking ? colors.success : colors.textMuted }]} />
                </View>
                <Text style={styles(colors, isDark).headerSubtitle}>
                  {showTyping
                    ? (isRTL ? "يفكر..." : "Thinking...")
                    : isSpeaking
                    ? (isRTL ? "يتحدث..." : "Responding...")
                    : (isRTL ? "نطق AI جاهز" : "Nutq AI ready")}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles(colors, isDark).modeBadge, { backgroundColor: `${activeModeMeta.color}18`, borderColor: `${activeModeMeta.color}40` }]}>
            <Ionicons name={activeModeMeta.icon as any} size={13} color={activeModeMeta.color} />
            <Text style={[styles(colors, isDark).modeBadgeText, { color: activeModeMeta.color }]}>
              {isRTL ? activeModeMeta.labelAr : activeModeMeta.labelEn}
            </Text>
          </View>
        </View>

        <View style={styles(colors, isDark).modeRow}>
          {CONVERSATION_MODES.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => {
                setActiveMode(mode.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles(colors, isDark).modeChip,
                activeMode === mode.id && { borderColor: mode.color, backgroundColor: `${mode.color}15` },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name={mode.icon as any}
                size={13}
                color={activeMode === mode.id ? mode.color : colors.textMuted}
              />
              <Text style={[styles(colors, isDark).modeLabel, activeMode === mode.id && { color: mode.color }]}>
                {isRTL ? mode.labelAr : mode.labelEn}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles(colors, isDark).messagesList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={showTyping ? <TypingBubble colors={colors} isDark={isDark} /> : null}
          renderItem={({ item }) => (
            <MessageBubble message={item} colors={colors} isDark={isDark} isRTL={isRTL} />
          )}
        />

        <View style={[styles(colors, isDark).inputArea, { paddingBottom: botInset + 10 }]}>
          <View style={[styles(colors, isDark).inputRow, { flexDirection: isRTL ? "row" : "row-reverse" }]}>
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || isStreaming}
              style={({ pressed }) => [styles(colors, isDark).sendBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient
                colors={inputText.trim() && !isStreaming ? [colors.blue, colors.purple] : [colors.backgroundCardBorder, colors.backgroundCardBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles(colors, isDark).sendBtnGrad}
              >
                {isStreaming ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Ionicons name="send" size={17} color={inputText.trim() ? "#fff" : colors.textMuted} />
                )}
              </LinearGradient>
            </Pressable>
            <TextInput
              ref={inputRef}
              style={[styles(colors, isDark).textInput, { textAlign: isRTL ? "right" : "left" }]}
              placeholder={isRTL ? "اكتب رسالتك..." : "Type your message..."}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              blurOnSubmit={false}
            />
          </View>
          <Text style={styles(colors, isDark).pointsHint}>
            {isRTL ? "كل رسالة = 5 نقاط" : "Every message = 5 points"}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </GridBackground>
  );
}

function MessageBubble({ message, colors, isDark, isRTL }: {
  message: Message;
  colors: any;
  isDark: boolean;
  isRTL: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <View style={[bubbleStyles.messageRow, isUser ? (isRTL ? bubbleStyles.userRowRTL : bubbleStyles.userRowLTR) : (isRTL ? bubbleStyles.aiRowRTL : bubbleStyles.aiRowLTR)]}>
      <View
        style={[
          bubbleStyles.bubble,
          isUser
            ? bubbleStyles.userBubble
            : [bubbleStyles.aiBubble, {
                backgroundColor: isDark ? colors.backgroundCard : "#FFFFFF",
                borderColor: isDark ? colors.border : colors.cardBorder,
              }],
        ]}
      >
        {isUser && (
          <LinearGradient
            colors={[colors.blue, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
        )}
        <Text style={[
          bubbleStyles.bubbleText,
          { color: isUser ? "#fff" : colors.text, textAlign: isRTL ? "right" : "left" },
        ]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function TypingBubble({ colors, isDark }: { colors: any; isDark: boolean }) {
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
    <View style={bubbleStyles.aiRowRTL}>
      <View style={[bubbleStyles.bubble, bubbleStyles.aiBubble, {
        paddingVertical: 14, paddingHorizontal: 20,
        backgroundColor: isDark ? colors.backgroundCard : "#fff",
        borderColor: isDark ? colors.border : colors.cardBorder,
      }]}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <Animated.View style={[bubbleStyles.typingDot, { backgroundColor: colors.blue }, s1]} />
          <Animated.View style={[bubbleStyles.typingDot, { backgroundColor: colors.purple }, s2]} />
          <Animated.View style={[bubbleStyles.typingDot, { backgroundColor: colors.blue }, s3]} />
        </View>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  messageRow: { marginVertical: 2 },
  userRowRTL: { alignItems: "flex-start" },
  userRowLTR: { alignItems: "flex-end" },
  aiRowRTL: { alignItems: "flex-end" },
  aiRowLTR: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" },
  userBubble: { borderBottomLeftRadius: 6 },
  aiBubble: { borderWidth: 1, borderBottomRightRadius: 6 },
  bubbleText: { fontSize: 15, fontFamily: "Cairo_400Regular", lineHeight: 24 },
  typingDot: { width: 7, height: 14, borderRadius: 4 },
});

function styles(colors: any, isDark: boolean) {
  const cardBg = isDark ? colors.backgroundCard : "#FFFFFF";
  const inputBg = isDark ? colors.backgroundCard : "#FFFFFF";
  const areaBg = isDark ? colors.backgroundSecondary : colors.backgroundCard;

  return StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
    },
    avatarRow: { alignItems: "center", justifyContent: "space-between" },
    statusInfo: { alignItems: "center", gap: 12 },
    statusRow: { alignItems: "center", gap: 6, marginTop: 2 },
    statusDotOuter: { width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    statusDotInner: { width: 6, height: 6, borderRadius: 3 },
    headerTitle: { fontSize: 24, fontFamily: "Cairo_700Bold", color: colors.text },
    headerSubtitle: { fontSize: 12, fontFamily: "Cairo_400Regular", color: colors.textSecondary },
    modeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
    modeBadgeText: { fontSize: 12, fontFamily: "Cairo_700Bold" },
    modeRow: { flexDirection: "row", gap: 8 },
    modeChip: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
      paddingVertical: 8, borderRadius: 100, backgroundColor: cardBg,
      borderWidth: 1.5, borderColor: colors.border, overflow: "hidden",
    },
    modeLabel: { fontSize: 12, fontFamily: "Cairo_600SemiBold", color: colors.textMuted },
    messagesList: { paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
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
      gap: 10,
      backgroundColor: inputBg,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 14,
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
    sendBtnGrad: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 16 },
    pointsHint: { fontSize: 11, fontFamily: "Cairo_400Regular", color: colors.textMuted, textAlign: "center" },
  });
}
