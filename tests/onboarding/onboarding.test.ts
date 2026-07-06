

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
import { OnboardingRepository } from "../../src/modules/onboarding/onboarding.repository";

vi.mock("../../src/modules/onboarding/onboarding.repository", () => ({
  OnboardingRepository: {
    upsertProfile: vi.fn(),
    getStatus: vi.fn(),
    checkCountryExists: vi.fn(),
    saveCountry: vi.fn(),
    getExams: vi.fn(),
    saveExamsTransaction: vi.fn(),
    completeOnboarding: vi.fn(),
    applyForMentorTransaction: vi.fn(),
  },
}));

import { query } from "../../src/config/db";

const app = createApp();

describe("Onboarding Module Integration Tests", () => {
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

    // Mock global DB query for authMiddleware
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "student", email_verified: true, onboarding_completed: false }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("GET /onboarding/status", () => {
    it("should return onboarding status", async () => {
      vi.mocked(OnboardingRepository.getStatus).mockResolvedValue({ onboarding_completed: true });

      const response = await request(app)
        .get("/onboarding/status")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.onboardingCompleted).toBe(true);
    });
  });

  describe("POST /onboarding/country", () => {
    it("should save country for a user", async () => {
      vi.mocked(OnboardingRepository.checkCountryExists).mockResolvedValue(true);
      
      const response = await request(app)
        .post("/onboarding/country")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ countryId: "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5" });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.saveCountry).toHaveBeenCalledWith("user-123", "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5");
    });

    it("should return 404 if country is not found", async () => {
      vi.mocked(OnboardingRepository.checkCountryExists).mockResolvedValue(false);
      
      const response = await request(app)
        .post("/onboarding/country")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ countryId: "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5" });

      expect(response.status).toBe(404); // Country not found
    });
  });

  describe("PATCH /onboarding/profile", () => {
    it("should update user profile", async () => {
      const response = await request(app)
        .patch("/onboarding/profile")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          fullName: "John Doe",
          age: 25,
          gender: "male"
        });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.upsertProfile).toHaveBeenCalled();
    });
  });

  describe("GET /onboarding/exams", () => {
    it("should return saved exams for user", async () => {
      vi.mocked(OnboardingRepository.getExams).mockResolvedValue([{ id: "exam-1", name: "JEE" }] as any);

      const response = await request(app)
        .get("/onboarding/exams")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe("PATCH /onboarding/exams", () => {
    it("should save exams for user", async () => {
      const response = await request(app)
        .patch("/onboarding/exams")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ examIds: ["b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5"] });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.saveExamsTransaction).toHaveBeenCalled();
    });
  });

  describe("PATCH /onboarding/study", () => {
    it("should update study details", async () => {
      const response = await request(app)
        .patch("/onboarding/study")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ studyTime: "evening" });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.upsertProfile).toHaveBeenCalled();
    });
  });

  describe("PATCH /onboarding/preferences", () => {
    it("should update matching preferences", async () => {
      const response = await request(app)
        .patch("/onboarding/preferences")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ lookingFor: ["Study Partner"] });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.upsertProfile).toHaveBeenCalled();
    });
  });

  describe("POST /onboarding/complete", () => {
    it("should mark onboarding as complete", async () => {
      const response = await request(app)
        .post("/onboarding/complete")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(OnboardingRepository.completeOnboarding).toHaveBeenCalledWith("user-123");
    });
  });

  describe("POST /onboarding/enhance-bio", () => {
    it("should trigger bio enhancement", async () => {
      // Mocking google genai is complex, but we can verify it reaches controller
      vi.mock("@google/genai", () => ({
        GoogleGenAI: class {
          models = {
            generateContent: vi.fn().mockResolvedValue({ text: "Enhanced bio" })
          }
        }
      }));
      
      const response = await request(app)
        .post("/onboarding/enhance-bio")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ bio: "I like coding." });

      expect(response.status).toBe(200); // Because it relies on un-mocked GoogleGenAI, let's just assert if it responds. Actually if it fails to hit real API it returns 500, but we test structure here.
    });
  });

  describe("POST /onboarding/mentor-application", () => {
    it("should process mentor application", async () => {
      vi.mocked(OnboardingRepository.checkCountryExists).mockResolvedValue(true);
      const response = await request(app)
        .post("/onboarding/mentor-application")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Senior Engineer",
          qualification: "BTech",
          experienceYears: 5,
          hourlyPrice: 100,
          countryId: "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5",
          examIds: []
        });

      expect(response.status).toBe(200);
      expect(OnboardingRepository.applyForMentorTransaction).toHaveBeenCalled();
    });
  });
});
