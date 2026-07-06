

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
import { ExamsRepository } from "../../src/modules/exams/exams.repository";

vi.mock("../../src/modules/exams/exams.repository", () => ({
  ExamsRepository: {
    getExamsByCountry: vi.fn(),
  },
}));

const app = createApp();

describe("Exams Module Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /exams/:countryId", () => {
    it("should return exams for a valid countryId", async () => {
      vi.mocked(ExamsRepository.getExamsByCountry).mockResolvedValue([
        { id: "exam-123", name: "JEE" },
        { id: "exam-456", name: "NEET" },
      ]);

      const response = await request(app).get("/exams/b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5"); // Needs to be a valid UUID for validation

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].name).toBe("JEE");
      expect(ExamsRepository.getExamsByCountry).toHaveBeenCalledWith("b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5");
    });

    it("should return 400 for invalid UUID format", async () => {
      const response = await request(app).get("/exams/invalid-id");

      expect(response.status).toBe(400); // Validation error
      expect(response.body.success).toBe(false);
    });
  });
});
