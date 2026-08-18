import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { AIRepository, AIMessage } from "./ai.repository";
import { aiToolsDeclaration } from "./ai.tools";
import { logger } from "@/config/logger";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];

export class AIService {
  /**
   * Sanitizes conversation history before sending to Gemini:
   * 1. Filters out empty/whitespace messages.
   * 2. Drops system messages (system instructions go in config.systemInstruction).
   * 3. Merges consecutive messages of the same role to strictly satisfy Gemini's turn alternation rule.
   * 4. Ensures history begins with 'user' role.
   * 5. Ensures history ends with 'model' role so that `chat.sendMessage({ message: userContent })` is the subsequent user turn.
   */
  static sanitizeHistory(
    messages: AIMessage[],
  ): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
    const history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    for (const m of messages) {
      if (m.role !== "user" && m.role !== "model") continue;
      const text = (m.content || "").trim();
      if (!text) continue;

      const last = history[history.length - 1];
      if (last && last.role === m.role && last.parts[0]) {
        last.parts[0].text += `\n\n${text}`;
      } else {
        history.push({
          role: m.role,
          parts: [{ text }],
        });
      }
    }

    // Ensure history starts with 'user'
    while (history.length > 0) {
      const first = history[0];
      if (first && first.role !== "user") {
        history.shift();
      } else {
        break;
      }
    }

    // Ensure history ends with 'model' before chat.sendMessage adds the next user message
    while (history.length > 0) {
      const last = history[history.length - 1];
      if (last && last.role === "user") {
        history.pop();
      } else {
        break;
      }
    }

    return history;
  }

  /**
   * Executes a Gemini API operation with fallback models on transient 503/429/overload errors.
   */
  static async executeWithFallback<T>(action: (model: string) => Promise<T>): Promise<T> {
    const candidateModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        return await action(model);
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("UNAVAILABLE") ||
          err?.message?.includes("no longer available");

        if (isTransient) {
          logger.warn(
            `Model ${model} returned transient error (${err.message}). Attempting next candidate...`,
          );
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  static async buildSystemPrompt(userId: string): Promise<string> {
    const context = await AIRepository.getUserContext(userId);
    const dateStr = new Date().toISOString().split("T")[0];
    const todayProgress = await AIRepository.getDailyProgress(userId, dateStr as string);

    let prompt = `You are StudySwap AI Companion, an empathetic study mentor and accountability coach.
Your job is to help students study consistently, understand difficult concepts, plan realistic routines, stay motivated, and adapt their study plan based on actual progress.

Today's Date: ${dateStr}

Student Context:
- Name: ${context.profile?.full_name || "Unknown"}
- Country: ${context.profile?.country || "Unknown"}
- Strong Subjects: ${context.profile?.strong_in || "None listed"}
- Needs Help With: ${context.profile?.need_help_with || "None listed"}
- Preferred Study Time: ${context.profile?.study_time || "Any"}
- Target Exams: ${context.exams.join(", ") || "None listed"}

Current Study Progress (Today):
`;
    if (todayProgress) {
      prompt += `- Planned Minutes: ${todayProgress.plan.planned_minutes}\n`;
      prompt += `- Actual Minutes: ${todayProgress.plan.actual_minutes}\n`;
      prompt += `- Tasks Completed: ${todayProgress.stats.completed_tasks} / ${todayProgress.stats.total_tasks}\n`;

      const pendingTasks = todayProgress.tasks
        .filter((t) => t.status === "pending")
        .map((t) => t.title)
        .join(", ");
      if (pendingTasks) {
        prompt += `- Pending Tasks: ${pendingTasks}\n`;
      }
    } else {
      prompt += "- No study plan generated for today yet.\n";
    }

    prompt += `
CRITICAL RULES:
1. Never invent student information, exam dates, scores, progress, or academic information.
2. Never claim that a task was completed unless the backend confirms it (use tools).
3. Prioritize actionable study routines, avoiding overlapping sessions and unrealistic workloads.
4. When you generate a study plan, always use the CREATE_STUDY_PLAN tool to persist it to the database.
5. If a student misses tasks, do not shame them. Understand the reason and adapt the next plan.
6. Make motivation actionable, avoid generic spam.
7. Explain academic concepts clearly, acknowledge uncertainty, and never fabricate facts.
8. Never provide medical, psychological, legal, or financial diagnosis/advice.
`;
    return prompt;
  }

  static async generateTitle(conversationId: string, firstMessage: string) {
    try {
      await this.executeWithFallback(async (model) => {
        const response = await ai.models.generateContent({
          model,
          contents: `Generate a short 3-5 word title for this study conversation based on the user's first message. Do not use quotes or prefixes. Message: "${firstMessage}"`,
        });
        if (response.text) {
          const title = response.text.replace(/["']/g, "").trim();
          await AIRepository.updateConversationTitle(conversationId, title);
        }
      });
    } catch (e: any) {
      logger.error("Title generation failed:", e);
    }
  }

  static async sendMessage(userId: string, conversationId: string, content: string) {
    // 1. Fetch recent message history
    const rawMessages = await AIRepository.getMessages(conversationId, 20);

    if (rawMessages.length === 0) {
      // Asynchronously generate title for the first message
      this.generateTitle(conversationId, content).catch((e) => logger.error("Title error", e));
    }

    // 2. Sanitize history to satisfy Gemini's turn alternation requirement
    const history = this.sanitizeHistory(rawMessages);

    // 3. Build System Instruction
    const systemInstruction = await this.buildSystemPrompt(userId);

    // 4. Save user message to database
    await AIRepository.saveMessage(conversationId, "user", content);

    try {
      // 5. Call Gemini with fallback
      const { finalContent, toolResponses } = await this.executeWithFallback(async (modelName) => {
        const chat = ai.chats.create({
          model: modelName,
          config: {
            systemInstruction,
            tools: [aiToolsDeclaration] as any,
          },
          history: history as any,
        });

        let response = await chat.sendMessage({ message: content });
        const toolCalls = response.functionCalls || [];
        const executedToolResponses: any[] = [];
        let modelText = response.text || "";

        // 6. Handle Tool Calls
        if (toolCalls.length > 0) {
          for (const call of toolCalls) {
            const args = (call.args || {}) as any;
            try {
              if (call.name === "CREATE_STUDY_PLAN") {
                const targetDate = args.date || new Date().toISOString().split("T")[0];
                const plannedMins =
                  typeof args.plannedMinutes === "number" ? args.plannedMinutes : 60;
                const tasks = Array.isArray(args.tasks) ? args.tasks : [];

                const plan = await AIRepository.createStudyPlanWithTasks(
                  userId,
                  targetDate,
                  plannedMins,
                  tasks,
                );
                executedToolResponses.push({
                  name: call.name,
                  id: call.id,
                  response: { success: true, planId: plan.id },
                });
              } else if (call.name === "RESCHEDULE_TASK") {
                const task = await AIRepository.updateTaskStatus(
                  args.taskId,
                  userId,
                  "rescheduled",
                );
                executedToolResponses.push({
                  name: call.name,
                  id: call.id,
                  response: { success: true, taskId: task?.id },
                });
              } else if (call.name === "GET_DAILY_PROGRESS") {
                const targetDate = args.date || new Date().toISOString().split("T")[0];
                const progress = await AIRepository.getDailyProgress(userId, targetDate);
                executedToolResponses.push({
                  name: call.name,
                  id: call.id,
                  response: progress || { error: "No plan found" },
                });
              } else {
                executedToolResponses.push({
                  name: call.name,
                  id: call.id,
                  response: { error: "Unknown function" },
                });
              }
            } catch (e: any) {
              logger.error("Tool execution error:", e);
              executedToolResponses.push({
                name: call.name,
                id: call.id,
                response: { error: e.message },
              });
            }
          }

          // Send tool responses back to Gemini
          const functionResponseParts = executedToolResponses.map((tr) => ({
            functionResponse: {
              name: tr.name,
              id: tr.id,
              response: tr.response,
            },
          }));

          response = await chat.sendMessage({ message: functionResponseParts as any });
          modelText = response.text || "";
        }

        return {
          finalContent: modelText,
          toolResponses: executedToolResponses,
        };
      });

      // 7. Save model response to database
      const modelMessage = await AIRepository.saveMessage(
        conversationId,
        "model",
        finalContent,
        toolResponses.length > 0 ? toolResponses : null,
      );

      return {
        id: modelMessage.id,
        content: finalContent,
        toolExecutions: toolResponses,
      };
    } catch (e: any) {
      logger.error("Gemini Error:", e);
      throw new Error("AI Companion is currently unavailable.");
    }
  }
}
