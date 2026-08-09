import { GoogleGenAI, Type } from "@google/genai";
import { env } from "@/config/env";
import { AIRepository } from "./ai.repository";
import { aiToolsDeclaration } from "./ai.tools";
import { logger } from "@/config/logger";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const MODEL = "gemini-3.5-flash";

export class AIService {
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
      
      const pendingTasks = todayProgress.tasks.filter(t => t.status === "pending").map(t => t.title).join(", ");
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

  static async sendMessage(userId: string, conversationId: string, content: string) {
    // 1. Fetch History
    const messages = await AIRepository.getMessages(conversationId, 15);
    
    // Format history for Gemini
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content || "" }]
    }));

    // Save user message
    await AIRepository.saveMessage(conversationId, "user", content);

    // 2. Build System Instruction
    const systemInstruction = await this.buildSystemPrompt(userId);

    try {
      // 3. Call Gemini
      const chat = ai.chats.create({
        model: MODEL,
        config: {
          systemInstruction: systemInstruction,
          tools: [aiToolsDeclaration] as any
        },
        history: history as any
      });

      let response = await chat.sendMessage({ message: content });

      let toolCalls = response.functionCalls || [];
      const toolResponses: any[] = [];
      let finalContent = response.text || "";

      // 4. Handle Tool Calls
      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          const args = call.args as any;
          try {
             if (call.name === "CREATE_STUDY_PLAN") {
               const plan = await AIRepository.createStudyPlanWithTasks(
                 userId,
                 args.date,
                 args.plannedMinutes,
                 args.tasks
               );
               toolResponses.push({ name: call.name, id: call.id, response: { success: true, planId: plan.id }});
             } 
             else if (call.name === "RESCHEDULE_TASK") {
               const task = await AIRepository.updateTaskStatus(args.taskId, userId, "rescheduled");
               toolResponses.push({ name: call.name, id: call.id, response: { success: true, taskId: task?.id }});
             }
             else if (call.name === "GET_DAILY_PROGRESS") {
               const progress = await AIRepository.getDailyProgress(userId, args.date);
               toolResponses.push({ name: call.name, id: call.id, response: progress || { error: "No plan found" }});
             }
             else {
               toolResponses.push({ name: call.name, id: call.id, response: { error: "Unknown function" }});
             }
          } catch (e: any) {
             logger.error("Tool execution error", e);
             toolResponses.push({ name: call.name, id: call.id, response: { error: e.message }});
          }
        }

        // Send tool responses back to Gemini
        const functionResponseParts = toolResponses.map(tr => ({
           functionResponse: {
             name: tr.name,
             id: tr.id,
             response: tr.response
           }
        }));

        response = await chat.sendMessage({ message: functionResponseParts as any });

        finalContent = response.text || "";
      }

      // 5. Save model response
      const modelMessage = await AIRepository.saveMessage(
        conversationId,
        "model",
        finalContent,
        toolResponses.length > 0 ? toolResponses : null
      );

      return {
        id: modelMessage.id,
        content: finalContent,
        toolExecutions: toolResponses
      };

    } catch (e: any) {
      console.error("\n\n=== GEMINI REAL ERROR ===", e, "\n\n");
      logger.error("Gemini Error:", e);
      throw new Error("AI Companion is currently unavailable.");
    }
  }
}
