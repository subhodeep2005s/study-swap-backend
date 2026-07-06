import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { getClient } from "../src/config/db";
import { redis } from "../src/config/redis";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { initSocketIO } from "../src/modules/communication/communication.socket";
import { env } from "../src/config/env";

const app = createApp();

describe("StudySwap Backend - Full Day In The Life Journey", () => {
  let studentToken: string;
  let mentorToken: string;
  const testStudentEmail = `student-${Date.now()}@test.com`;
  const testMentorEmail = `mentor-${Date.now()}@test.com`;
  
  let studentId: string;
  let mentorUserId: string;
  let mentorProfileId: string;
  let countryId: string;
  
  // Bookings & Mentor
  let planId: string;
  let slotId: string;

  // Matches
  let matchId: string;

  // Communication
  let conversationId: string;
  let callId: string;

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
      if (studentId) {
        await client.query("DELETE FROM users WHERE id = $1", [studentId]);
      }
      if (mentorUserId) {
        await client.query("DELETE FROM users WHERE id = $1", [mentorUserId]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Cleanup failed", e);
    } finally {
      client.release();
      await redis.quit();
    }
  });

  describe("1. Authentication", () => {
    it("✅ Student creates account and logs in", async () => {
      let res = await request(app).post("/auth/send-otp").send({ email: testStudentEmail });
      expect(res.status).toBe(200);

      const otp = await redis.get(`otp:${testStudentEmail}`);
      expect(otp).toBeTruthy();

      res = await request(app).post("/auth/verify-otp").send({ email: testStudentEmail, otp });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();

      studentToken = res.body.data.token;
      studentId = res.body.data.user.id;
    });

    it("✅ Mentor creates account and logs in", async () => {
      let res = await request(app).post("/auth/send-otp").send({ email: testMentorEmail });
      expect(res.status).toBe(200);

      const otp = await redis.get(`otp:${testMentorEmail}`);
      res = await request(app).post("/auth/verify-otp").send({ email: testMentorEmail, otp });
      expect(res.status).toBe(200);
      
      mentorToken = res.body.data.token;
      mentorUserId = res.body.data.user.id;
    });
  });

  describe("2. Onboarding & Countries", () => {
    it("✅ Fetch available countries", async () => {
      const res = await request(app).get("/countries");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      countryId = res.body.data.length > 0 ? res.body.data[0].id : "00000000-0000-0000-0000-000000000000";
    });

    it("✅ Student completes onboarding profile", async () => {
      const res = await request(app)
        .patch("/onboarding/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          fullName: "Test Student",
          age: 21,
          gender: "male",
          state: "TestState",
          countryId,
          bio: "Looking for a study partner."
        });
      expect(res.status).toBeLessThan(300);
    });

    it("✅ Mentor completes onboarding profile", async () => {
      const res = await request(app)
        .patch("/onboarding/profile")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          fullName: "Test Mentor",
          age: 30,
          gender: "female",
          state: "TestState",
          countryId,
          bio: "I am an expert mentor."
        });
      expect(res.status).toBeLessThan(300);
    });
  });

  describe("3. Mentor Role Management", () => {
    it("✅ System upgrades user to Mentor", async () => {
      const client = await getClient();
      try {
        await client.query("UPDATE users SET role = 'mentor' WHERE id = $1", [mentorUserId]);
        const mentorProfileRes = await client.query(
          "INSERT INTO mentors (user_id, title, qualification, experience_years, about) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [mentorUserId, "Senior Engineer", "BTech", 5, "I help students."]
        );
        mentorProfileId = mentorProfileRes.rows[0].id;
      } finally {
        client.release();
      }
      
      // Re-fetch mentor token now that role is updated
      const otpRes = await request(app).post("/auth/send-otp").send({ email: testMentorEmail });
      const otp = await redis.get(`otp:${testMentorEmail}`);
      const loginRes = await request(app).post("/auth/verify-otp").send({ email: testMentorEmail, otp });
      mentorToken = loginRes.body.data.token; // Now contains 'mentor' role
    });
  });

  describe("4. Mentor Dashboard & Student View", () => {
    it("✅ Mentor creates a plan", async () => {
      const res = await request(app)
        .post("/mentor/plans")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "1-on-1 Guidance",
          description: "A quick chat",
          price: 50,
          duration_minutes: 30
        });
      expect(res.status).toBeLessThan(300);
      planId = res.body.data.id;
    });

    it("✅ Mentor creates availability slots", async () => {
      const dayOfWeek = new Date(Date.now() + 86400000).getUTCDay(); // tomorrow
      const res = await request(app)
        .put("/mentor/availability")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          availability: [{
            day_of_week: dayOfWeek,
            start_time: "00:00",
            end_time: "23:59"
          }]
        });
      expect(res.status).toBeLessThan(300);
    });

    it("✅ Student fetches mentor slots", async () => {
      const date = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const res = await request(app)
        .get(`/mentors/${mentorProfileId}/slots?planId=${planId}&date=${date}`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      slotId = res.body.data[0].id;
    });

    it("✅ Student browses mentors", async () => {
      const res = await request(app)
        .get("/mentors")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("✅ Student views mentor dashboard", async () => {
      const res = await request(app)
        .get(`/mentors/${mentorProfileId}`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mentorProfileId);
    });
    
    it("✅ Student books a mentor slot", async () => {
      const res = await request(app)
        .post("/mentors/book")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          mentorId: mentorProfileId,
          planId: planId,
          slotId: slotId
        });
      expect(res.status).toBeLessThan(300);
    });
  });

  describe("5. Stories", () => {
    it("✅ Student creates a story", async () => {
      const testFilePath = path.join(__dirname, "test-story.jpg");
      fs.writeFileSync(testFilePath, "dummy-image-content");

      try {
        const res = await request(app)
          .post("/stories")
          .set("Authorization", `Bearer ${studentToken}`)
          .field("caption", "Studying for my exam!")
          .attach("media", testFilePath);
      } finally {
        fs.unlinkSync(testFilePath);
      }
    });

    it("✅ Mentor views own story views", async () => {
      const res = await request(app)
        .get("/stories/views")
        .set("Authorization", `Bearer ${mentorToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("6. Matching Module", () => {
    it("✅ System mocks a pending match", async () => {
      // Force a pending match so we can test the pipeline
      const client = await getClient();
      try {
        const mRes = await client.query(
          "INSERT INTO user_matches (user_id, matched_user_id, matched_by, status) VALUES ($1, $2, 'exam', 'pending') RETURNING id",
          [studentId, mentorUserId]
        );
        matchId = mRes.rows[0].id;
      } finally {
        client.release();
      }
    });

    it("✅ Student swipes right (accepts match)", async () => {
      const res = await request(app)
        .patch(`/matches/${matchId}/accept`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("7. Communication (Messaging, Calls, Focus)", () => {
    it("✅ Fetch conversations list", async () => {
      const res = await request(app)
        .get("/communication/conversations")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      if (res.body.data.length > 0) {
        conversationId = res.body.data[0].conversationId;
      }
    });

    it("✅ Send a message", async () => {
      const res = await request(app)
        .post(`/communication/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          conversationId,
          messageType: "TEXT",
          message: "Hello from e2e test!"
        });
      expect(res.status).toBeLessThan(300);
    });

    it("✅ Fetch messages", async () => {
      const res = await request(app)
        .get(`/communication/conversations/${conversationId}/messages`)
        .set("Authorization", `Bearer ${mentorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it("✅ Start a call", async () => {
      const res = await request(app)
        .post("/communication/calls")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          conversationId,
          type: "VIDEO"
        });
      expect(res.status).toBeLessThan(300);
      if (res.body.data) callId = res.body.data.id || res.body.data.call_id;
    });

    it("✅ Accept a call", async () => {
      if (!callId) return;
      const res = await request(app)
        .patch(`/communication/calls/${callId}/accept`)
        .set("Authorization", `Bearer ${mentorToken}`);
      expect(res.status).toBeLessThan(300);
    });

    it("✅ Start a focus session", async () => {
      const res = await request(app)
        .post("/communication/focus")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          conversationId,
          durationSeconds: 1500
        });
      expect(res.status).toBeLessThan(300);
    });
  });

  describe("8. Teardown", () => {
    it("✅ Account cleanup via DELETE /me", async () => {
      await request(app).delete("/auth/me").set("Authorization", `Bearer ${studentToken}`);
      await request(app).delete("/auth/me").set("Authorization", `Bearer ${mentorToken}`);
      
      studentId = "";
      mentorUserId = "";
    });
  });
});
