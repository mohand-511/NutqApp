import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
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
  Easing,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { SaudiAvatar } from "@/components/Avatar";

const CONVERSATION_MODES = [
  { id: "casual", label: "دردشة عادية", icon: "chatbubble-outline" },
  { id: "science", label: "نقاش علمي", icon: "flask-outline" },
  { id: "roleplay", label: "لعب أدوار", icon: "people-outline" },
  { id: "interview", label: "مقابلة عمل", icon: "briefcase-outline" },
];

const AI_RESPONSES: Record<string, string[]> = {
  casual: [
    "أهلاً وسهلاً! كيف حالك اليوم؟ سعيد بمحادثتك.",
    "ذلك جميل جداً! أخبرني أكثر عن هذا الموضوع.",
    "وجهة نظر رائعة! أتفق معك تماماً.",
    "ما شاء الله، لغتك جميلة! استمر في التدريب.",
  ],
  science: [
    "موضوع مثير للاهتمام! من المنظور العلمي، هناك عدة نظريات تدعم هذا.",
    "دراسات حديثة أثبتت أن هذه الظاهرة ترتبط ارتباطاً وثيقاً بما ذكرته.",
    "سؤالك يشير إلى فهم عميق! دعني أوضح لك الجانب التقني.",
  ],
  roleplay: [
    "مرحباً بك في المقهى! ماذا تريد أن تطلب؟",
    "أنا المدير، هلا أخبرتني عن خبرتك في هذا المجال؟",
    "إنها فرصة رائعة! كيف ستتعامل مع هذا الموقف؟",
  ],
  interview: [
    "شكراً لحضورك! أخبرني عن نفسك وخبراتك.",
    "سؤال جيد. لماذا تريد العمل في شركتنا؟",
    "نقطة قوية! كيف تتعامل مع ضغط العمل؟",
  ],
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function SolifScreen() {
  const insets = useSafeAreaInsets();
  const { addPoints } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      text: "أهلاً! أنا مساعدك الذكي في نطق. اختر نمط المحادثة وابدأ التحدث!",
      isUser: false,
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [activeMode, setActiveMode] = useState("casual");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botInset = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  async function sendMessage() {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setIsTyping(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const delay = 1000 + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, delay));

    const responses = AI_RESPONSES[activeMode] || AI_RESPONSES.casual;
    const aiResponse = responses[Math.floor(Math.random() * responses.length)];

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      isUser: false,
      timestamp: Date.now(),
    };

    setIsTyping(false);
    setIsSpeaking(true);
    setMessages((prev) => [aiMsg, ...prev]);
    await addPoints(5);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => setIsSpeaking(false), 2500);
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <LinearGradient
          colors={["rgba(5,5,8,0.98)", "rgba(5,5,8,0)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerGlow}>
            <SaudiAvatar size={80} speaking={isSpeaking} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>سوالف</Text>
            <Text style={styles.headerSubtitle}>
              {isSpeaking ? "يتحدث..." : isTyping ? "يكتب..." : "جاهز للمحادثة"}
            </Text>
            <View style={styles.statusDot}>
              <View style={[styles.statusDotInner, { backgroundColor: isSpeaking || isTyping ? Colors.success : Colors.textMuted }]} />
              <Text style={styles.statusText}>
                {isSpeaking || isTyping ? "نشط" : "في انتظارك"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.modeScroll}>
          {CONVERSATION_MODES.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => {
                setActiveMode(mode.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={({ pressed }) => [
                styles.modeChip,
                activeMode === mode.id && styles.modeChipActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              {activeMode === mode.id && (
                <LinearGradient
                  colors={[Colors.blue, Colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Ionicons
                name={mode.icon as any}
                size={14}
                color={activeMode === mode.id ? "#fff" : Colors.textSecondary}
              />
              <Text style={[styles.modeLabel, activeMode === mode.id && styles.modeLabelActive]}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            isTyping ? (
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <TypingIndicator />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} />
          )}
        />

        <View style={[styles.inputArea, { paddingBottom: botInset + 12 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="اكتب رسالتك..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlign="right"
              onSubmitEditing={sendMessage}
            />
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              <LinearGradient
                colors={inputText.trim() ? [Colors.blue, Colors.purple] : [Colors.backgroundCardBorder, Colors.backgroundCardBorder]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtnGrad}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={inputText.trim() ? "#fff" : Colors.textMuted}
                />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  return (
    <View style={[styles.messageRow, message.isUser ? styles.messageRowUser : styles.messageRowAI]}>
      <View style={[styles.messageBubble, message.isUser ? styles.userBubble : styles.aiBubble]}>
        {message.isUser && (
          <LinearGradient
            colors={[Colors.blue, Colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text style={[styles.messageText, message.isUser && styles.messageTextUser]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  React.useEffect(() => {
    dot1.value = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
      -1, true
    );
    dot2.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 200 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1, true
    );
    dot3.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1, true
    );
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 4, alignItems: "center" }}>
      <Animated.View style={[styles.typingDot, s1]} />
      <Animated.View style={[styles.typingDot, s2]} />
      <Animated.View style={[styles.typingDot, s3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerGlow: {
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
    color: Colors.text,
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  statusDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  statusDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Cairo_400Regular",
    color: Colors.textMuted,
  },
  modeScroll: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  modeChipActive: { borderColor: Colors.blue },
  modeLabel: {
    fontSize: 12,
    fontFamily: "Cairo_600SemiBold",
    color: Colors.textSecondary,
  },
  modeLabelActive: { color: "#fff" },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  messageRow: { marginVertical: 4 },
  messageRowUser: { alignItems: "flex-left" },
  messageRowAI: { alignItems: "flex-right" },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  },
  userBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: "right",
  },
  messageTextUser: { color: "#fff" },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    color: Colors.text,
    maxHeight: 120,
    paddingVertical: 6,
    textAlignVertical: "top",
  },
  sendBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  sendBtnDisabled: {},
  sendBtnGrad: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});
