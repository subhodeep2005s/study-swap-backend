import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { getClient } from "../src/config/db";
import { redis } from "../src/config/redis";
import { createServer } from "http";
import { initSocketIO } from "../src/modules/communication/communication.socket";
import { env } from "../src/config/env";

const app = createApp();

describe("StudySwap Backend - Communication Hard Tests", () => {
  let s1Token: string;
  let s2Token: string;
  const s1Email = `student1-${Date.now()}@test.com`;
  const s2Email = `student2-${Date.now()}@test.com`;
  
  let s1Id: string;
  let s2Id: string;
  let matchId: string;
  let conversationId: string;
  let messageId: string;
  let callId: string;
  let focusId: string;

  beforeAll(async () => {
    env.LIVEKIT_API_KEY = "test_key";
    env.LIVEKIT_API_SECRET = "test_secret";
    env.LIVEKIT_WS_URL = "ws://localhost:7880";

    const httpServer = createServer(app);
    await initSocketIO(httpServer);
  });

  afterAll(async () => {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      if (s1Id) await client.query("DELETE FROM users WHERE id = $1", [s1Id]);
      if (s2Id) await client.query("DELETE FROM users WHERE id = $1", [s2Id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Cleanup failed", e);
    } finally {
      client.release();
      await redis.quit();
    }
  });

  it("✅ Register two students", async () => {
    const cRes = await request(app).get("/countries");
    const countryId = cRes.body.data.countries.length > 0 ? cRes.body.data.countries[0].id : "00000000-0000-0000-0000-000000000000";

    // Student 1
    let res = await request(app).post("/auth/send-otp").send({ email: s1Email });
    expect(res.status).toBe(200);
    let otp = await redis.get(`otp:${s1Email}`);
    res = await request(app).post("/auth/verify-otp").send({ email: s1Email, otp });
    s1Token = res.body.data.token;
    s1Id = res.body.data.user.id;

    res = await request(app).patch("/onboarding/profile").set("Authorization", `Bearer ${s1Token}`).send({
      name: "Student 1",
      city: "City A",
      state: "State A",
      countryId,
      role: "student",
      exams: ["UPSC"]
    });
    expect(res.status).toBe(200);

    // Student 2
    res = await request(app).post("/auth/send-otp").send({ email: s2Email });
    expect(res.status).toBe(200);
    otp = await redis.get(`otp:${s2Email}`);
    res = await request(app).post("/auth/verify-otp").send({ email: s2Email, otp });
    s2Token = res.body.data.token;
    s2Id = res.body.data.user.id;

    res = await request(app).patch("/onboarding/profile").set("Authorization", `Bearer ${s2Token}`).send({
      name: "Student 2",
      city: "City B",
      state: "State B",
      countryId,
      role: "student",
      exams: ["UPSC"]
    });
    expect(res.status).toBe(200);
  });

  it("✅ System mocks a match and Student 1 accepts", async () => {
    const client = await getClient();
    try {
      const mRes = await client.query(
        "INSERT INTO user_matches (user_id, matched_user_id, matched_by, status) VALUES ($1, $2, 'exam', 'pending') RETURNING id",
        [s1Id, s2Id]
      );
      matchId = mRes.rows[0].id;
    } finally {
      client.release();
    }
    const res = await request(app)
      .patch(`/matches/${matchId}/accept`)
      .set("Authorization", `Bearer ${s1Token}`);
    expect(res.status).toBe(200);
  });

  it("✅ Both can fetch conversations", async () => {
    const res1 = await request(app).get("/communication/conversations").set("Authorization", `Bearer ${s1Token}`);
    expect(res1.body.data.length).toBeGreaterThan(0);
    conversationId = res1.body.data[0].conversationId;

    const res2 = await request(app).get("/communication/conversations").set("Authorization", `Bearer ${s2Token}`);
    expect(res2.body.data.length).toBeGreaterThan(0);
  });

  it("✅ Student 1 sends a text message", async () => {
    const res = await request(app)
      .post(`/communication/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${s1Token}`)
      .send({
        conversationId,
        messageType: "TEXT",
        message: "Hello Student 2, let's study!"
      });
    expect(res.status).toBeLessThan(300);
    messageId = res.body.data.id;
  });

  it("✅ Student 2 fetches and reads message", async () => {
    let res = await request(app)
      .get(`/communication/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${s2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    
    res = await request(app)
      .patch(`/communication/conversations/${conversationId}/read`)
      .set("Authorization", `Bearer ${s2Token}`);
    expect(res.status).toBe(200);
  });

  it("✅ Student 2 replies with an attachment", async () => {
    const res = await request(app)
      .post(`/communication/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${s2Token}`)
      .send({
        conversationId,
        messageType: "FILE",
        attachment: {
            url: "https://example.com/test.pdf",
            filename: "test.pdf",
            mimeType: "application/pdf",
            extension: "pdf",
            size: 1024,
        },
        replyToMessageId: messageId
      });
    expect(res.status).toBeLessThan(300);
  });

  it("✅ Student 1 starts a call", async () => {
    const res = await request(app)
      .post(`/communication/calls`)
      .set("Authorization", `Bearer ${s1Token}`)
      .send({
        conversationId,
        type: "VIDEO"
      });
    expect(res.status).toBeLessThan(300);
    callId = res.body.data.id || res.body.data.callId; 
  });

  it("✅ Student 2 accepts the call", async () => {
    const res = await request(app)
      .patch(`/communication/calls/${callId}/accept`)
      .set("Authorization", `Bearer ${s2Token}`);
    expect(res.status).toBeLessThan(300);
  });

  it("✅ Student 1 ends the call", async () => {
    const res = await request(app)
      .patch(`/communication/calls/${callId}/end`)
      .set("Authorization", `Bearer ${s1Token}`);
    expect(res.status).toBeLessThan(300);
  });

  it("✅ Student 2 starts a focus session", async () => {
    const res = await request(app)
      .post(`/communication/focus`)
      .set("Authorization", `Bearer ${s2Token}`)
      .send({
        conversationId,
        durationSeconds: 3600
      });
    expect(res.status).toBeLessThan(300);
    focusId = res.body.data.id || res.body.data.focusId;
  });

  it("✅ Student 1 accepts focus session", async () => {
    const res = await request(app)
      .patch(`/communication/focus/${focusId}/accept`)
      .set("Authorization", `Bearer ${s1Token}`);
    expect(res.status).toBeLessThan(300);
  });

  it("✅ Student 2 ends focus session", async () => {
    const res = await request(app)
      .patch(`/communication/focus/${focusId}/end`)
      .set("Authorization", `Bearer ${s2Token}`);
    expect(res.status).toBeLessThan(300);
  });
});
