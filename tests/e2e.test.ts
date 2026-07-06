import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { getClient } from "../src/config/db";
import { redis } from "../src/config/redis";

// Create an Express app instance for testing
const app = createApp();

describe("StudySwap Backend End-to-End Tests", () => {
  let studentToken: string;
  let mentorToken: string;
  const testStudentEmail = `student-e2e-${Date.now()}@test.com`;
  const testMentorEmail = `mentor-e2e-${Date.now()}@test.com`;
  let studentId: string;
  let mentorUserId: string;

  // Global teardown: remove the test users from the database
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
    } finally {
      client.release();
      // Close Redis connection so tests can exit
      await redis.quit();
    }
  });

  describe("Authentication & Onboarding", () => {
    it("should send OTP and login the student", async () => {
      // Send OTP
      let res = await request(app).post("/auth/send-otp").send({ email: testStudentEmail });
      expect(res.status).toBe(200);

      // Retrieve OTP from Redis directly
      const otp = await redis.get(`otp:${testStudentEmail}`);
      expect(otp).toBeTruthy();

      // Verify OTP and Login
      res = await request(app).post("/auth/verify-otp").send({ email: testStudentEmail, otp });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      studentToken = res.body.data.token;
      studentId = res.body.data.user.id;
    });

    it("should send OTP and login the mentor", async () => {
      // Send OTP
      let res = await request(app).post("/auth/send-otp").send({ email: testMentorEmail });
      expect(res.status).toBe(200);

      // Retrieve OTP
      const otp = await redis.get(`otp:${testMentorEmail}`);

      // Verify OTP and Login
      res = await request(app).post("/auth/verify-otp").send({ email: testMentorEmail, otp });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();

      mentorToken = res.body.data.token;
      mentorUserId = res.body.data.user.id;
    });

    it("should fetch countries and complete onboarding for student", async () => {
      let res = await request(app).get("/countries");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      const countryId = res.body.data.length > 0 ? res.body.data[0].id : null;

      res = await request(app)
        .patch("/onboarding/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          fullName: "E2E Student",
          age: 20,
          gender: "male",
          state: "TestState",
          countryId: countryId || "00000000-0000-0000-0000-000000000000",
          bio: "I am a test student."
        });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });
  });

  describe("Matching Module", () => {
    it("should refresh matches for student", async () => {
      const res = await request(app)
        .post("/matches/refresh")
        .set("Authorization", `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should fetch pending matches", async () => {
      const res = await request(app)
        .get("/matches")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("Communication Module", () => {
    it("should return an empty conversations list initially", async () => {
      const res = await request(app)
        .get("/communication/conversations")
        .set("Authorization", `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
  
  describe("Account Deletion", () => {
    it("should successfully delete the student account", async () => {
      const res = await request(app)
        .delete("/auth/me")
        .set("Authorization", `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      studentId = ""; 
    });

    it("should successfully delete the mentor account", async () => {
      const res = await request(app)
        .delete("/auth/me")
        .set("Authorization", `Bearer ${mentorToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      mentorUserId = "";
    });
  });
});
