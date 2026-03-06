import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { db } from "./db";
import { userSettings, chatMessages, userActivity, userProfiles, users } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT_AR = `أنت مساعد تعليمي ذكي في تطبيق "نطق" لتعلم اللغة والتواصل. 
اسمك هو "نطق AI" وأنت متخصص في:
- تطوير مهارات التحدث والمحادثة
- تصحيح الأخطاء اللغوية بأسلوب لطيف
- تقديم نماذج محادثة احترافية
- دعم تعلم اللغة العربية والإنجليزية

أسلوبك:
- ودود، تشجيعي، وإيجابي دائماً
- تستخدم العربية الفصحى البسيطة أو العامية السعودية بحسب المحادثة
- تعطي ملاحظات بناءة على لغة المستخدم
- ردودك مختصرة وواضحة (3-5 جمل عادةً)
- تنهي ردودك أحياناً بسؤال لتشجيع الاستمرار في المحادثة`;

const SYSTEM_PROMPTS: Record<string, string> = {
  casual: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "دردشة عادية" - تحدث بشكل طبيعي وودي.`,
  science: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "نقاش علمي" - ناقش الموضوعات العلمية والتقنية بعمق ووضوح.`,
  roleplay: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "لعب أدوار" - العب دوراً محدداً في السيناريو الذي يختاره المستخدم.`,
  interview: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "مقابلة عمل" - العب دور المحاور المهني واسأل أسئلة مقابلات العمل الشائعة.`,
};

const STAGE_PROMPTS: Record<number, string> = {
  1: "أنت تساعد المستخدم في تعلم أساسيات المحادثة. ابدأ بتحية بسيطة وسؤال عن حاله.",
  2: "أنت تساعد المستخدم على تعلم طرح الأسئلة والإجابة عليها.",
  3: "أنت تساعد المستخدم على تقديم نفسه باحتراف.",
  4: "أنت تساعد المستخدم على بناء جمل مركبة.",
  5: "أنت تساعد المستخدم على التحضير للمقابلات الوظيفية.",
  6: "أنت تساعد المستخدم على تطوير مهارات النقاش والإقناع.",
  7: "أنت تساعد المستخدم على التحدث عن الذكاء الاصطناعي والتقنية.",
  8: "أنت تساعد المستخدم على تطوير مهارات الخطابة والعرض.",
};

async function ensureUser(email: string, name: string) {
  let existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const inserted = await db.insert(users).values({ email, name, password: "local-auth" }).returning({ id: users.id });
  const userId = inserted[0].id;
  await db.insert(userProfiles).values({ userId }).onConflictDoNothing();
  await db.insert(userSettings).values({ userId }).onConflictDoNothing();
  return userId;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Chat (streaming SSE) ─────────────────────────────────────────────────
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, mode = "casual", stageId, userId, email, name } = req.body;
      let systemPrompt = stageId
        ? `${SYSTEM_PROMPT_AR}\n\n${STAGE_PROMPTS[stageId] || STAGE_PROMPTS[1]}`
        : SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.casual;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: 500,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();

      // Persist to DB in background
      if (email && name && messages.length > 0) {
        ensureUser(email, name).then(async (uid) => {
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg?.role === "user") {
            await db.insert(chatMessages).values({ userId: uid, role: "user", content: lastUserMsg.content, mode });
          }
          if (fullResponse) {
            await db.insert(chatMessages).values({ userId: uid, role: "assistant", content: fullResponse, mode });
          }
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) res.status(500).json({ error: "AI chat failed" });
      else { res.write(`data: ${JSON.stringify({ error: "AI error" })}\n\n`); res.end(); }
    }
  });

  // ── TTS — Text to Speech (OpenAI) ────────────────────────────────────────
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "shimmer" } = req.body;
      if (!text) return res.status(400).json({ error: "text required" });

      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: text.slice(0, 500),
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "TTS failed" });
    }
  });

  // ── User Settings ─────────────────────────────────────────────────────────
  app.post("/api/user/sync", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || !name) return res.status(400).json({ error: "email and name required" });
      const userId = await ensureUser(email, name);
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
      res.json({ userId, settings: settings || null, profile: profile || null });
    } catch (error) {
      console.error("User sync error:", error);
      res.status(500).json({ error: "sync failed" });
    }
  });

  app.patch("/api/user/settings", async (req, res) => {
    try {
      const { userId, ...updates } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await db.update(userSettings).set({ ...updates, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "update failed" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      const { userId, ...updates } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await db.update(userProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "update failed" });
    }
  });

  // ── Chat History ──────────────────────────────────────────────────────────
  app.get("/api/user/chat-history", async (req, res) => {
    try {
      const { userId, mode, limit = "50" } = req.query as Record<string, string>;
      if (!userId) return res.status(400).json({ error: "userId required" });
      let query = db.select().from(chatMessages).where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.createdAt)).limit(parseInt(limit));
      const msgs = await query;
      res.json(msgs.reverse());
    } catch (error) {
      console.error("Chat history error:", error);
      res.status(500).json({ error: "fetch failed" });
    }
  });

  app.delete("/api/user/chat-history", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: "delete failed" });
    }
  });

  // ── Activity Log ──────────────────────────────────────────────────────────
  app.get("/api/user/activity", async (req, res) => {
    try {
      const { userId, limit = "20" } = req.query as Record<string, string>;
      if (!userId) return res.status(400).json({ error: "userId required" });
      const activities = await db.select().from(userActivity)
        .where(eq(userActivity.userId, userId))
        .orderBy(desc(userActivity.createdAt))
        .limit(parseInt(limit));
      res.json(activities);
    } catch (error) {
      console.error("Activity error:", error);
      res.status(500).json({ error: "fetch failed" });
    }
  });

  app.post("/api/user/activity", async (req, res) => {
    try {
      const { userId, type, titleAr, titleEn, points = 0, icon = "star", color = "#2563EB" } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });
      await db.insert(userActivity).values({ userId, type, titleAr, titleEn, points, icon, color });
      res.json({ success: true });
    } catch (error) {
      console.error("Activity insert error:", error);
      res.status(500).json({ error: "insert failed" });
    }
  });

  // ── Stage Hint ────────────────────────────────────────────────────────────
  app.post("/api/stage-hint", async (req, res) => {
    try {
      const { stageId, stageName, userLevel } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `أنت مدرب لغوي خبير في تطبيق نطق. قدم نصيحة قصيرة ومفيدة.` },
          { role: "user", content: `المرحلة: ${stageName}، مستوى المستخدم: ${userLevel}. قدم نصيحة عملية واحدة مختصرة (جملتان فقط).` },
        ],
        max_tokens: 150,
      });
      res.json({ hint: response.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error("Stage hint error:", error);
      res.status(500).json({ error: "Failed to get hint" });
    }
  });

  // ── AI Coaching ───────────────────────────────────────────────────────────
  app.post("/api/coaching-tip", async (req, res) => {
    try {
      const { completedStages, points, streak, goal, level } = req.body;
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `أنت مدرب تعليمي شخصي في تطبيق نطق. قدم نصيحة تحفيزية شخصية.` },
          { role: "user", content: `المستخدم: أكمل ${completedStages} مرحلة، لديه ${points} نقطة، سلسلة ${streak} أيام، هدفه: ${goal}، مستواه: ${level}. قدم نصيحة تحفيزية شخصية قصيرة (3 جمل فقط).` },
        ],
        max_tokens: 200,
      });
      res.json({ tip: response.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error("Coaching tip error:", error);
      res.status(500).json({ error: "Failed to get coaching tip" });
    }
  });

  // ── Word of the Day ───────────────────────────────────────────────────────
  app.get("/api/word-of-day", async (req, res) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `اختر كلمة عربية أو إنجليزية مفيدة لمتعلمي اللغة. قدمها بهذا الشكل JSON فقط:
{"word":"الكلمة","translation":"الترجمة","pronunciation":"النطق","example":"مثال على الاستخدام","tip":"نصيحة لحفظ الكلمة"}`,
        }],
        max_tokens: 200,
        response_format: { type: "json_object" },
      });
      res.json(JSON.parse(response.choices[0]?.message?.content || "{}"));
    } catch (error) {
      res.json({ word: "مرحبا", translation: "Hello", pronunciation: "Mar-ha-ban", example: "مرحبا، كيف حالك؟", tip: "تذكر أن تبدأ كل محادثة بالتحية" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
