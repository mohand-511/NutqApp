import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

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
  roleplay: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "لعب أدوار" - العب دوراً محدداً في السيناريو الذي يختاره المستخدم (موظف، مدير، عميل، إلخ).`,
  interview: `${SYSTEM_PROMPT_AR}\n\nأنت في وضع "مقابلة عمل" - العب دور المحاور المهني واسأل أسئلة مقابلات العمل الشائعة وقيّم إجابات المستخدم.`,
};

const STAGE_PROMPTS: Record<number, string> = {
  1: "أنت تساعد المستخدم في تعلم أساسيات المحادثة باللغة العربية والإنجليزية. ابدأ بتحية بسيطة وسؤال عن حاله.",
  2: "أنت تساعد المستخدم على تعلم طرح الأسئلة والإجابة عليها. اطرح أسئلة بسيطة وشجعه على الإجابة.",
  3: "أنت تساعد المستخدم على تقديم نفسه باحتراف. اطلب منه أن يقدم نفسه وقدم ملاحظات على أسلوبه.",
  4: "أنت تساعد المستخدم على بناء جمل مركبة. قدم له جمل بسيطة واطلب منه توسيعها أو تعقيدها.",
  5: "أنت تساعد المستخدم على التحضير للمقابلات الوظيفية. العب دور المحاور وقيّم إجاباته.",
  6: "أنت تساعد المستخدم على تطوير مهارات النقاش والإقناع. قدم موضوعاً للنقاش وشجعه على الدفاع عن رأيه.",
  7: "أنت تساعد المستخدم على التحدث عن الذكاء الاصطناعي والتقنية. ناقش معه أحدث التطورات التقنية.",
  8: "أنت تساعد المستخدم على تطوير مهارات الخطابة والعرض. اطلب منه تقديم عرضاً قصيراً وقدم ملاحظات مفصلة.",
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Main chat endpoint - SSE streaming
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, mode = "casual", stageId } = req.body;

      let systemPrompt = stageId
        ? `${SYSTEM_PROMPT_AR}\n\n${STAGE_PROMPTS[stageId] || STAGE_PROMPTS[1]}`
        : SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.casual;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "AI chat failed" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "AI error" })}\n\n`);
        res.end();
      }
    }
  });

  // Stage hint endpoint - gives AI coaching for a specific stage
  app.post("/api/stage-hint", async (req, res) => {
    try {
      const { stageId, stageName, userLevel } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `أنت مدرب لغوي خبير في تطبيق نطق. قدم نصيحة قصيرة ومفيدة للمستخدم.`,
          },
          {
            role: "user",
            content: `المرحلة: ${stageName}، مستوى المستخدم: ${userLevel}. قدم نصيحة عملية واحدة مختصرة (جملتان فقط) لمساعدته على النجاح في هذه المرحلة.`,
          },
        ],
        max_tokens: 150,
      });

      res.json({ hint: response.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error("Stage hint error:", error);
      res.status(500).json({ error: "Failed to get hint" });
    }
  });

  // AI coaching tip for profile
  app.post("/api/coaching-tip", async (req, res) => {
    try {
      const { completedStages, points, streak, goal, level } = req.body;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `أنت مدرب تعليمي شخصي في تطبيق نطق. قدم نصيحة تحفيزية شخصية.`,
          },
          {
            role: "user",
            content: `المستخدم: أكمل ${completedStages} مرحلة، لديه ${points} نقطة، سلسلة ${streak} أيام، هدفه: ${goal}، مستواه: ${level}. قدم نصيحة تحفيزية شخصية قصيرة (3 جمل فقط).`,
          },
        ],
        max_tokens: 200,
      });

      res.json({ tip: response.choices[0]?.message?.content || "" });
    } catch (error) {
      console.error("Coaching tip error:", error);
      res.status(500).json({ error: "Failed to get coaching tip" });
    }
  });

  // Word of the day
  app.get("/api/word-of-day", async (req, res) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `اختر كلمة عربية أو إنجليزية مفيدة لمتعلمي اللغة. قدمها بهذا الشكل JSON فقط:
{
  "word": "الكلمة",
  "translation": "الترجمة",
  "pronunciation": "النطق",
  "example": "مثال على الاستخدام",
  "tip": "نصيحة لحفظ الكلمة"
}`,
          },
        ],
        max_tokens: 200,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      res.json(JSON.parse(content));
    } catch (error) {
      console.error("Word of day error:", error);
      res.json({
        word: "مرحبا",
        translation: "Hello",
        pronunciation: "Mar-ha-ban",
        example: "مرحبا، كيف حالك؟",
        tip: "تذكر أن تبدأ كل محادثة بالتحية",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
