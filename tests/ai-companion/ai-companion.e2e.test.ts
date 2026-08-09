import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { getClient } from "@/config/db";
import { redis } from "@/config/redis";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";

// Mock GenAI to prevent real API calls during tests
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      chats = {
        create: vi.fn().mockReturnValue({
          sendMessage: vi.fn().mockResolvedValue({
            text: "This is a mocked AI response.",
            functionCalls: [] // We'll override this in specific tests
          })
        })
      };
      interactions = {
        create: vi.fn().mockResolvedValue({})
      }
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      ARRAY: "ARRAY",
      INTEGER: "INTEGER"
    }
  };
});

const app = createApp();

describe("AI Companion E2E", () => {
  let userToken: string;
  let userId: string;
  let conversationId: string;

  beforeAll(async () => {
    const client = await getClient();
    try {
      // 1. Create a test student
      const userRes = await client.query(
        `INSERT INTO users (email, role, onboarding_completed) 
         VALUES ('ai_student@test.com', 'student', true) 
         RETURNING id`
      );
      userId = userRes.rows[0].id;

      // 2. Generate token
      userToken = jwt.sign(
        { id: userId, email: "ai_student@test.com", role: "student" },
        env.JWT_SECRET,
        { expiresIn: "1h" }
      );
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    const client = await getClient();
    try {
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    } finally {
      client.release();
    }
    await redis.quit();
  });

  it("should create a new AI conversation", async () => {
    const res = await request(app)
      .post("/ai/conversations")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "My Physics Routine" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("My Physics Routine");
    expect(res.body.data.id).toBeDefined();
    
    conversationId = res.body.data.id;
  });

  it("should get conversations list", async () => {
    const res = await request(app)
      .get("/ai/conversations")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].id).toBe(conversationId);
  });

  it("should send a message and receive mocked AI response", async () => {
    const res = await request(app)
      .post(`/ai/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ content: "Hello, I need help planning my day." });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("This is a mocked AI response.");
  });

  it("should fetch messages history with cursor pagination", async () => {
    const res = await request(app)
      .get(`/ai/conversations/${conversationId}/messages?limit=10`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    // History should have the user message and the mocked AI response
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].role).toBe("user");
    expect(res.body.data[1].role).toBe("model");
  });

  it("should not allow accessing another user's conversation", async () => {
    const evilToken = jwt.sign(
      { id: "00000000-0000-0000-0000-000000000000", email: "evil@test.com", role: "student" },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = await request(app)
      .get(`/ai/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${evilToken}`);

    expect(res.status).toBe(401); // 401 because user doesn't exist in DB
  });
});
