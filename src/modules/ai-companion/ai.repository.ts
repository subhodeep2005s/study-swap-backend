import { query, getClient } from "@/config/db";

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "model" | "system";
  content: string;
  metadata: any;
  created_at: Date;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  date: string | Date;
  status: "active" | "completed" | "cancelled";
  planned_minutes: number;
  actual_minutes: number;
}

export interface StudyTask {
  id: string;
  plan_id: string;
  title: string;
  subject: string | null;
  duration: number;
  start_time: Date | null;
  status: "pending" | "completed" | "skipped" | "rescheduled";
  priority: "low" | "medium" | "high";
  completed_at: Date | null;
  actual_duration: number | null;
}

export class AIRepository {
  // ==========================================
  // CONVERSATIONS & MESSAGES
  // ==========================================
  static async getConversations(userId: string): Promise<AIConversation[]> {
    const res = await query<AIConversation>(
      "SELECT * FROM ai_conversations WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );
    return res.rows;
  }

  static async getConversation(conversationId: string): Promise<AIConversation | null> {
    const res = await query<AIConversation>("SELECT * FROM ai_conversations WHERE id = $1", [conversationId]);
    return res.rows[0] || null;
  }

  static async createConversation(userId: string, title: string): Promise<AIConversation> {
    const res = await query<AIConversation>(
      "INSERT INTO ai_conversations (user_id, title) VALUES ($1, $2) RETURNING *",
      [userId, title]
    );
    return res.rows[0]!;
  }

  static async updateConversationTime(conversationId: string): Promise<void> {
    await query("UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
  }

  static async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await query("DELETE FROM ai_conversations WHERE id = $1 AND user_id = $2", [conversationId, userId]);
  }

  static async saveMessage(
    conversationId: string,
    role: "user" | "model" | "system",
    content: string | null,
    metadata: any = null
  ): Promise<AIMessage> {
    const res = await query<AIMessage>(
      "INSERT INTO ai_messages (conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING *",
      [conversationId, role, content, metadata ? JSON.stringify(metadata) : null]
    );
    await this.updateConversationTime(conversationId);
    return res.rows[0]!;
  }

  static async getMessages(conversationId: string, limit: number = 20, cursor?: Date): Promise<AIMessage[]> {
    let sql = "SELECT * FROM ai_messages WHERE conversation_id = $1";
    const params: any[] = [conversationId];

    if (cursor) {
      sql += " AND created_at < $2";
      params.push(cursor);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await query<AIMessage>(sql, params);
    return res.rows.reverse(); // Return in chronological order
  }

  // ==========================================
  // CONTEXT FOR AI
  // ==========================================
  static async getUserContext(userId: string): Promise<any> {
    const profileRes = await query(
      `SELECT p.full_name, p.age, p.bio, p.strong_in, p.need_help_with, p.study_time, c.name as country 
       FROM profiles p 
       LEFT JOIN countries c ON p.country_id = c.id 
       WHERE p.user_id = $1`,
      [userId]
    );

    const examRes = await query(
      `SELECT e.name as exam_name 
       FROM user_education_nodes ue 
       JOIN education_nodes e ON ue.node_id = e.id 
       WHERE ue.user_id = $1`,
      [userId]
    );

    return {
      profile: profileRes.rows[0] || null,
      exams: examRes.rows.map(r => r.exam_name)
    };
  }

  // ==========================================
  // STUDY ROUTINE (PLAN & TASKS)
  // ==========================================
  static async getStudyPlanByDate(userId: string, date: string): Promise<StudyPlan | null> {
    const res = await query<StudyPlan>(
      "SELECT * FROM study_plans WHERE user_id = $1 AND date = $2",
      [userId, date]
    );
    return res.rows[0] || null;
  }

  static async getTasksForPlan(planId: string): Promise<StudyTask[]> {
    const res = await query<StudyTask>(
      "SELECT * FROM study_tasks WHERE plan_id = $1 ORDER BY COALESCE(start_time, created_at) ASC",
      [planId]
    );
    return res.rows;
  }

  static async createStudyPlanWithTasks(
    userId: string,
    date: string,
    plannedMinutes: number,
    tasks: { title: string; subject?: string; duration: number; start_time?: Date; priority?: string }[]
  ): Promise<StudyPlan> {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      // Upsert plan
      const planRes = await client.query<StudyPlan>(
        `INSERT INTO study_plans (user_id, date, planned_minutes) 
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date) 
         DO UPDATE SET planned_minutes = study_plans.planned_minutes + EXCLUDED.planned_minutes, updated_at = NOW()
         RETURNING *`,
        [userId, date, plannedMinutes]
      );
      
      const planId = planRes.rows[0]!.id;

      // Insert tasks
      for (const t of tasks) {
        await client.query(
          `INSERT INTO study_tasks (plan_id, title, subject, duration, start_time, priority)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [planId, t.title, t.subject || null, t.duration, t.start_time || null, t.priority || "medium"]
        );
      }

      await client.query("COMMIT");
      return planRes.rows[0]!;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  static async updateTaskStatus(
    taskId: string,
    userId: string, // for authorization check
    status: "completed" | "skipped" | "rescheduled" | "pending"
  ): Promise<StudyTask | null> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Verify ownership
      const taskRes = await client.query(
        `SELECT t.*, p.user_id FROM study_tasks t 
         JOIN study_plans p ON t.plan_id = p.id 
         WHERE t.id = $1`,
        [taskId]
      );

      if (taskRes.rows.length === 0 || taskRes.rows[0].user_id !== userId) {
        throw new Error("Task not found or unauthorized");
      }

      const completedAt = status === "completed" ? new Date() : null;
      
      const updateRes = await client.query<StudyTask>(
        `UPDATE study_tasks SET status = $1, completed_at = $2, updated_at = NOW() 
         WHERE id = $3 RETURNING *`,
        [status, completedAt, taskId]
      );

      // If completed, update the plan's actual_minutes
      if (status === "completed") {
        await client.query(
          "UPDATE study_plans SET actual_minutes = actual_minutes + $1 WHERE id = $2",
          [updateRes.rows[0]!.duration, updateRes.rows[0]!.plan_id]
        );
      } else if ((taskRes.rows[0] as any).status === "completed" ) {
        // If undoing completion, subtract minutes
        await client.query(
          "UPDATE study_plans SET actual_minutes = GREATEST(0, actual_minutes - $1) WHERE id = $2",
          [updateRes.rows[0]!.duration, updateRes.rows[0]!.plan_id]
        );
      }

      await client.query("COMMIT");
      return updateRes.rows[0] ?? null;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // PROGRESS ENGINE
  // ==========================================
  static async getDailyProgress(userId: string, date: string) {
    const plan = await this.getStudyPlanByDate(userId, date);
    if (!plan) return null;

    const tasks = await this.getTasksForPlan(plan.id);
    
    return {
      plan,
      stats: {
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === "completed").length,
        skipped_tasks: tasks.filter((t) => t.status === "skipped").length,
        pending_tasks: tasks.filter((t) => t.status === "pending").length,
        rescheduled_tasks: tasks.filter((t) => t.status === "rescheduled").length,
      },
      tasks
    };
  }
}
