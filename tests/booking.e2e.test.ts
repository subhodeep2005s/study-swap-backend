import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { getClient, query } from "../src/config/db";
import { redis } from "../src/config/redis";

const app = createApp();

describe("Booking Flow - E2E (Google Meet Integration)", () => {
  // ---- Mentor setup ----
  let mentorToken: string;
  let mentorUserId: string;
  let mentorId: string; // mentors table id
  const mentorEmail = `booking-mentor-${Date.now()}@test.com`;

  // ---- Student setup ----
  let studentToken: string;
  let studentUserId: string;
  const studentEmail = `booking-student-${Date.now()}@test.com`;

  // ---- Booking artifacts ----
  let planId: string;
  let slotId: string;
  let bookingId: string;

  afterAll(async () => {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      // Clean up bookings, slots, plans, mentors, users
      if (bookingId) await client.query("DELETE FROM mentor_bookings WHERE id = $1", [bookingId]);
      if (slotId) await client.query("DELETE FROM mentor_slots WHERE id = $1", [slotId]);
      if (planId) await client.query("DELETE FROM mentor_plans WHERE id = $1", [planId]);
      if (mentorUserId) await client.query("DELETE FROM users WHERE id = $1", [mentorUserId]);
      if (studentUserId) await client.query("DELETE FROM users WHERE id = $1", [studentUserId]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    await redis.quit();
  });

  // ========================================
  // 1. Setup Mentor
  // ========================================
  describe("1. Mentor Setup", () => {
    it("should register mentor via OTP", async () => {
      // Send OTP
      const sendRes = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: mentorEmail });
      expect(sendRes.status).toBe(200);

      // Get OTP from Redis
      const otp = await redis.get(`otp:${mentorEmail}`);
      expect(otp).toBeTruthy();

      // Verify OTP with mentor role
      const verifyRes = await request(app)
        .post("/api/auth/verify-otp")
        .send({ email: mentorEmail, otp, role: "mentor" });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.user.role).toBe("mentor");
      mentorToken = verifyRes.body.data.token;
      mentorUserId = verifyRes.body.data.user.id;
    });

    it("should complete mentor profile", async () => {
      const res = await request(app)
        .patch("/api/onboarding/profile")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          fullName: "Booking Test Mentor",
          age: 28,
          bio: "Expert mentor for booking tests."
        });
      expect(res.status).toBe(200);
    });

    it("should apply as mentor and auto-verify", async () => {
      const res = await request(app)
        .post("/api/onboarding/mentor-application")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "Booking Test Specialist",
          qualification: "MSc in Testing",
          experienceYears: 5,
          hourlyPrice: 75,
          about: "I help students ace their exams."
        });
      expect(res.status).toBe(200);

      // Get the mentor table ID
      const mentorRow = await query("SELECT id FROM mentors WHERE user_id = $1", [mentorUserId]);
      mentorId = mentorRow.rows[0].id;
      expect(mentorId).toBeDefined();
    });

    it("should create a plan", async () => {
      const res = await request(app)
        .post("/api/mentor/plans")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "1-Hour Session",
          duration_minutes: 60,
          price: 50,
          is_active: true
        });

      expect(res.status).toBe(201);
      planId = res.body.data.id;
      expect(planId).toBeDefined();
    });

    it("should create a slot", async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 48); // 2 days from now

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
      slotId = res.body.data.id;
      expect(slotId).toBeDefined();
    });
  });

  // ========================================
  // 2. Setup Student
  // ========================================
  describe("2. Student Setup", () => {
    it("should register student via OTP", async () => {
      const sendRes = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: studentEmail });
      expect(sendRes.status).toBe(200);

      const otp = await redis.get(`otp:${studentEmail}`);
      expect(otp).toBeTruthy();

      const verifyRes = await request(app)
        .post("/api/auth/verify-otp")
        .send({ email: studentEmail, otp });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.user.role).toBe("student");
      studentToken = verifyRes.body.data.token;
      studentUserId = verifyRes.body.data.user.id;
    });

    it("should complete student profile", async () => {
      const res = await request(app)
        .patch("/api/onboarding/profile")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          fullName: "Booking Test Student",
          age: 20,
          bio: "Ready to learn."
        });
      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // 3. Booking Flow
  // ========================================
  describe("3. Book Session", () => {
    it("should book a session successfully", async () => {
      const res = await request(app)
        .post("/api/mentors/book")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          mentorId,
          planId,
          slotId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toBeDefined();
      bookingId = res.body.data.bookingId;
    });

    it("should not double-book the same slot", async () => {
      const res = await request(app)
        .post("/api/mentors/book")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          mentorId,
          planId,
          slotId
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // 4. Verify Booking from Student Side
  // ========================================
  describe("4. Student Booking View", () => {
    it("should list student bookings with Google Meet fields", async () => {
      const res = await request(app)
        .get("/api/mentors/bookings")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);

      const booking = res.body.data[0];
      expect(booking.id).toBe(bookingId);
      expect(booking.status).toBe("confirmed");
      expect(booking.plan_title).toBe("1-Hour Session");
      expect(booking.mentor_name).toBe("Booking Test Mentor");
      expect(booking.meeting_provider).toBe("GOOGLE_MEET");
      // google_meet_url may or may not be set depending on Google config
      expect(booking).toHaveProperty("google_meet_url");
      expect(booking).toHaveProperty("google_calendar_url");
    });

    it("should get a single booking with Google Meet fields", async () => {
      const res = await request(app)
        .get(`/api/mentors/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(bookingId);
      expect(res.body.data.meeting_provider).toBe("GOOGLE_MEET");
      expect(res.body.data).toHaveProperty("google_meet_url");
      expect(res.body.data).toHaveProperty("google_calendar_url");
    });
  });

  // ========================================
  // 5. Verify Booking from Mentor Side
  // ========================================
  describe("5. Mentor Booking View", () => {
    it("should list mentor bookings from dashboard", async () => {
      const res = await request(app)
        .get("/api/mentor/bookings")
        .set("Authorization", `Bearer ${mentorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const booking = res.body.data.find((b: any) => b.id === bookingId);
      expect(booking).toBeDefined();
      expect(booking.status).toBe("confirmed");
    });
  });

  // ========================================
  // 6. Google Meet Link Check
  // ========================================
  describe("6. Google Meet Link Verification", () => {
    it("should have meeting_provider set to GOOGLE_MEET", async () => {
      // Wait a moment for async Google Meet creation to finish (if configured)
      await new Promise(resolve => setTimeout(resolve, 3000));

      const result = await query(
        "SELECT google_event_id, google_meet_url, google_calendar_url, meeting_provider, meeting_link FROM mentor_bookings WHERE id = $1",
        [bookingId]
      );

      const booking = result.rows[0];
      expect(booking).toBeDefined();
      expect(booking.meeting_provider).toBe("GOOGLE_MEET");

      // If Google is configured, these should be populated
      if (booking.google_event_id) {
        expect(booking.google_meet_url).toBeTruthy();
        expect(booking.google_meet_url).toMatch(/^https:\/\/meet\.google\.com\//);
        expect(booking.google_calendar_url).toBeTruthy();
        expect(booking.meeting_link).toBe(booking.google_meet_url);
        console.log("✅ Google Meet link generated:", booking.google_meet_url);
      } else {
        // Google not configured — fields should be null
        expect(booking.google_meet_url).toBeNull();
        console.log("⚠️  Google not configured — meet link is null (expected in test env)");
      }
    });
  });

  // ========================================
  // 7. Cancel Booking
  // ========================================
  describe("7. Cancel Booking", () => {
    it("should cancel the booking", async () => {
      const res = await request(app)
        .patch(`/api/mentors/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should show cancelled status", async () => {
      const res = await request(app)
        .get(`/api/mentors/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("cancelled");
    });

    it("should not cancel an already cancelled booking", async () => {
      const res = await request(app)
        .patch(`/api/mentors/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
    });

    it("should free up the slot after cancellation", async () => {
      const result = await query("SELECT is_booked FROM mentor_slots WHERE id = $1", [slotId]);
      expect(result.rows[0].is_booked).toBe(false);
    });
  });
});
