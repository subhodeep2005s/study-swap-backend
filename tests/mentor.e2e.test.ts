import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { getClient } from "../src/config/db";
import { redis } from "../src/config/redis";

const app = createApp();

describe("Mentor Module - E2E Journey", () => {
  let mentorToken: string;
  let mentorUserId: string;
  const testMentorEmail = `mentor-test-${Date.now()}@test.com`;
  
  let planId: string;
  let slotId: string;

  afterAll(async () => {
    // Cleanup the test mentor
    const client = await getClient();
    try {
      await client.query("BEGIN");
      if (mentorUserId) {
        await client.query("DELETE FROM users WHERE id = $1", [mentorUserId]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    
    await redis.quit();
  });

  describe("1. Mentor Account Creation & Auth", () => {
    it("should send OTP to mentor email", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: testMentorEmail });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should verify OTP with role: mentor", async () => {
      // Get OTP directly from Redis
      const otp = await redis.get(`otp:${testMentorEmail}`);
      expect(otp).toBeTruthy();

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ 
          email: testMentorEmail, 
          otp,
          role: "mentor" 
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe("mentor");
      
      mentorToken = res.body.data.token;
      mentorUserId = res.body.data.user.id;
    });
  });

  describe("2. Mentor Onboarding", () => {
    it("should allow mentor to update basic profile", async () => {
      const res = await request(app)
        .patch("/api/onboarding/profile")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          fullName: "Expert Test Mentor",
          age: 30,
          bio: "I am an expert at writing test code."
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should allow mentor to apply and auto-verify", async () => {
      const res = await request(app)
        .post("/api/onboarding/mentor-application")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "Senior Test Engineer",
          qualification: "PhD in Testing",
          experienceYears: 10,
          hourlyPrice: 100,
          about: "Testing is my life."
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("3. Mentor Dashboard Management", () => {
    it("should fetch mentor profile from dashboard", async () => {
      const res = await request(app)
        .get("/api/mentor/profile")
        .set("Authorization", `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Senior Test Engineer");
      expect(res.body.data.is_verified).toBe(true);
    });

    it("should create a mentor plan", async () => {
      const res = await request(app)
        .post("/api/mentor/plans")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "1-on-1 Test Coaching",
          duration_minutes: 60,
          price: 50,
          is_active: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      
      planId = res.body.data.id;
    });

    it("should list mentor plans", async () => {
      const res = await request(app)
        .get("/api/mentor/plans")
        .set("Authorization", `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("1-on-1 Test Coaching");
    });

    it("should create a mentor slot", async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 24); // Tomorrow
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const res = await request(app)
        .post("/api/mentor/slots")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      
      slotId = res.body.data.id;
    });

    it("should list mentor slots", async () => {
      const res = await request(app)
        .get("/api/mentor/slots")
        .set("Authorization", `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("4. Public Visibility", () => {
    it("should appear in the public mentor directory", async () => {
      const res = await request(app)
        .get("/api/mentors")
        // Can be authenticated as any user, or we just pass the mentor's token
        .set("Authorization", `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      // Ensure our test mentor is in the list
      const testMentor = res.body.data.find((m: any) => m.title === "Senior Test Engineer");
      expect(testMentor).toBeDefined();
      expect(testMentor.is_verified).toBe(true);
      expect(testMentor.full_name).toBe("Expert Test Mentor");
    });
  });
});
