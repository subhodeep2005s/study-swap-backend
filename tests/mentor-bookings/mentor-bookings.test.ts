

vi.mock("../../src/config/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), connect: vi.fn(), end: vi.fn(), on: vi.fn() },
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: vi.fn().mockResolvedValue({ query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), release: vi.fn() }),
}));
vi.mock("../../src/config/redis", () => ({
  redis: {
    get: vi.fn(), set: vi.fn(), setex: vi.fn(), ttl: vi.fn(), del: vi.fn(), quit: vi.fn(), on: vi.fn(), incr: vi.fn(),
    mget: vi.fn(), sadd: vi.fn(), expire: vi.fn(), smembers: vi.fn(),
    multi: vi.fn(() => ({ incr: vi.fn().mockReturnThis(), pttl: vi.fn().mockReturnThis(), expire: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([[null, 1], [null, 60000]]) })),
  },
  closeRedis: vi.fn(),
}));
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../../src/app";
import { query } from "../../src/config/db";
import { MentorBookingsRepository } from "../../src/modules/mentor-bookings/mentor-bookings.repository";

vi.mock("../../src/modules/mentor-bookings/mentor-bookings.repository", () => ({
  MentorBookingsRepository: {
    ensureMentor: vi.fn(),
    getMentorProfile: vi.fn(),
    updateMentorProfile: vi.fn(),
    getPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    getAvailability: vi.fn(),
    updateAvailabilityTransaction: vi.fn(),
    getBookings: vi.fn(),
    getBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
    cancelMentorBookingTransaction: vi.fn(),
  }
}));

const app = createApp();

describe("Mentor Bookings Module Integration Tests", () => {
  let validToken: string;
  const validUuid = "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5";

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "user-123", role: "mentor" }, process.env.JWT_SECRET!);

    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "mentor", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });

    vi.mocked(MentorBookingsRepository.ensureMentor).mockResolvedValue(validUuid as any);
  });

  describe("Profile endpoints", () => {
    it("should get profile", async () => {
      vi.mocked(MentorBookingsRepository.getMentorProfile).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).get("/mentor/profile").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update profile", async () => {
      vi.mocked(MentorBookingsRepository.updateMentorProfile).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch("/mentor/profile")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ bio: "Expert in Node.js" });
      expect(response.status).toBe(200);
    });
  });

  describe("Plans endpoints", () => {
    it("should get plans", async () => {
      vi.mocked(MentorBookingsRepository.getPlans).mockResolvedValue([] as any);
      const response = await request(app).get("/mentor/plans").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should create plan", async () => {
      vi.mocked(MentorBookingsRepository.createPlan).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .post("/mentor/plans")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Basic Plan", description: "Desc", duration_minutes: 30, price: 50, is_active: true });
      expect(response.status).toBe(201); // Assumed 201
    });

    it("should update plan", async () => {
      vi.mocked(MentorBookingsRepository.updatePlan).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/mentor/plans/${validUuid}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ price: 60 });
      expect(response.status).toBe(200);
    });

    it("should delete plan", async () => {
      vi.mocked(MentorBookingsRepository.deletePlan).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).delete(`/mentor/plans/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Availability endpoints", () => {
    it("should get availability", async () => {
      vi.mocked(MentorBookingsRepository.getAvailability).mockResolvedValue([] as any);
      const response = await request(app).get("/mentor/availability").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update availability", async () => {
      vi.mocked(MentorBookingsRepository.updateAvailabilityTransaction).mockResolvedValue([] as any);
      const response = await request(app)
        .put("/mentor/availability")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          availability: [
            { day_of_week: 1, start_time: "09:00", end_time: "17:00" }
          ]
        });
      expect(response.status).toBe(200);
    });
  });

  describe("Bookings endpoints", () => {
    it("should get bookings", async () => {
      vi.mocked(MentorBookingsRepository.getBookings).mockResolvedValue([] as any);
      const response = await request(app).get("/mentor/bookings").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get booking by id", async () => {
      vi.mocked(MentorBookingsRepository.getBooking).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).get(`/mentor/bookings/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should confirm booking", async () => {
      vi.mocked(MentorBookingsRepository.updateBookingStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).patch(`/mentor/bookings/${validUuid}/confirm`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should complete booking", async () => {
      vi.mocked(MentorBookingsRepository.updateBookingStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).patch(`/mentor/bookings/${validUuid}/complete`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should cancel booking", async () => {
      vi.mocked(MentorBookingsRepository.cancelMentorBookingTransaction).mockResolvedValue({ success: true } as any);
      const response = await request(app).patch(`/mentor/bookings/${validUuid}/cancel`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
});
