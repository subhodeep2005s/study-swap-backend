

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
import { MentorsRepository } from "../../src/modules/mentors/mentors.repository";
import { redis } from "../../src/config/redis";

vi.mock("../../src/modules/mentors/mentors.repository", () => ({
  MentorsRepository: {
    getVerifiedMentors: vi.fn(),
    getMentorsByMyExams: vi.fn(),
    getMentor: vi.fn(),
    getMentorPlans: vi.fn(),
    getMentorPlan: vi.fn(),
    getAvailabilityForDay: vi.fn(),
    getBookingsForDate: vi.fn(),
    bookSessionTransaction: vi.fn(),
    updateBookingMeetingDetails: vi.fn(),
    getStudentBookings: vi.fn(),
    getStudentBooking: vi.fn(),
    cancelBookingTransaction: vi.fn(),
  }
}));

const app = createApp();

describe("Mentors Module Integration Tests", () => {
  let validToken: string;
  const validUuid = "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5";

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "student", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("GET /mentors", () => {
    it("should get verified mentors", async () => {
      vi.mocked(MentorsRepository.getVerifiedMentors).mockResolvedValue([] as any);
      const response = await request(app).get("/mentors").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe("GET /mentors/my-exams-mentors", () => {
    it("should get mentors by exams", async () => {
      vi.mocked(MentorsRepository.getMentorsByMyExams).mockResolvedValue([] as any);
      const response = await request(app).get("/mentors/my-exams-mentors").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /mentors/bookings", () => {
    it("should get student bookings", async () => {
      vi.mocked(MentorsRepository.getStudentBookings).mockResolvedValue([] as any);
      const response = await request(app).get("/mentors/bookings").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /mentors/bookings/:id", () => {
    it("should get student booking by id", async () => {
      vi.mocked(MentorsRepository.getStudentBooking).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).get(`/mentors/bookings/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PATCH /mentors/bookings/:id/cancel", () => {
    it("should cancel a booking", async () => {
      vi.mocked(MentorsRepository.cancelBookingTransaction).mockResolvedValue({ success: true } as any);
      const response = await request(app).patch(`/mentors/bookings/${validUuid}/cancel`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /mentors/:id", () => {
    it("should get mentor details", async () => {
      vi.mocked(MentorsRepository.getMentor).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app).get(`/mentors/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /mentors/:id/plans", () => {
    it("should get mentor plans", async () => {
      vi.mocked(MentorsRepository.getMentorPlans).mockResolvedValue([] as any);
      const response = await request(app).get(`/mentors/${validUuid}/plans`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /mentors/:id/slots", () => {
    it("should get mentor slots", async () => {
      vi.mocked(MentorsRepository.getMentorPlan).mockResolvedValue({ id: validUuid, duration_minutes: 60, is_active: true } as any);
      vi.mocked(MentorsRepository.getAvailabilityForDay).mockResolvedValue([] as any);
      vi.mocked(MentorsRepository.getBookingsForDate).mockResolvedValue([] as any);
      const response = await request(app)
        .get(`/mentors/${validUuid}/slots?date=2030-01-01&planId=${validUuid}`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /mentors/book", () => {
    it("should book a session", async () => {
      vi.mocked(MentorsRepository.getMentorPlan).mockResolvedValue({ id: validUuid, duration_minutes: 60, is_active: true } as any);
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ mentor_id: validUuid, start_time: "2030-01-01T10:00:00Z", end_time: "2030-01-01T11:00:00Z" }));
      vi.mocked(MentorsRepository.bookSessionTransaction).mockResolvedValue({ id: validUuid, google_event_id: null } as any);
      
      const response = await request(app)
        .post("/mentors/book")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          mentorId: validUuid,
          planId: validUuid,
          slotId: validUuid
        });
      
      expect(response.status).toBe(201); // Assumed 201 for create
    });
  });
});
