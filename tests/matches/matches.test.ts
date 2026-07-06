

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
import { MatchesRepository } from "../../src/modules/matches/matches.repository";
import { CommunicationRepository } from "../../src/modules/communication/communication.repository";

vi.mock("../../src/modules/matches/matches.repository", () => ({
  MatchesRepository: {
    getMatchContext: vi.fn(),
    getMatchesByStatus: vi.fn(),
    getMatch: vi.fn(),
    generateMatches: vi.fn(),
    insertMatches: vi.fn(),
    updateMatchStatus: vi.fn(),
  }
}));

vi.mock("../../src/modules/communication/communication.repository", () => ({
  CommunicationRepository: {
    getOrCreateConversation: vi.fn(),
  }
}));

vi.mock("../../src/modules/stories/stories.service", () => ({
  getStories: vi.fn().mockResolvedValue({}),
}));

const app = createApp();

describe("Matches Module Integration Tests", () => {
  let validToken: string;

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

  describe("GET endpoints", () => {
    it("should get pending matches", async () => {
      vi.mocked(MatchesRepository.getMatchesByStatus).mockResolvedValue([]);
      const response = await request(app).get("/matches").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it("should get saved matches", async () => {
      vi.mocked(MatchesRepository.getMatchesByStatus).mockResolvedValue([]);
      const response = await request(app).get("/matches/saved").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get accepted matches", async () => {
      vi.mocked(MatchesRepository.getMatchesByStatus).mockResolvedValue([]);
      const response = await request(app).get("/matches/accepted").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get mymatches", async () => {
      vi.mocked(MatchesRepository.getMatchesByStatus).mockResolvedValue([]);
      const response = await request(app).get("/matches/mymatches").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get chats", async () => {
      vi.mocked(MatchesRepository.getMatchesByStatus).mockResolvedValue([]);
      const response = await request(app).get("/matches/chats").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get match by id", async () => {
      vi.mocked(MatchesRepository.getMatchContext).mockResolvedValue({ exams: [], state: "NY" } as any);
      vi.mocked(MatchesRepository.getMatch).mockResolvedValue({ id: "match-123" } as any);
      const response = await request(app).get("/matches/match-123").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /refresh", () => {
    it("should refresh matches", async () => {
      vi.mocked(MatchesRepository.generateMatches).mockResolvedValue({ rows: [{ matched_user_id: "user-456", compatibility_score: 85 }] } as any);
      vi.mocked(MatchesRepository.insertMatches).mockResolvedValue(true as never);
      const response = await request(app).post("/matches/refresh").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("PATCH endpoints", () => {
    const validUuid = "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5";
    
    it("should accept match", async () => {
      vi.mocked(MatchesRepository.updateMatchStatus).mockResolvedValue(true as never);
      const response = await request(app).patch(`/matches/${validUuid}/accept`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should reject match", async () => {
      vi.mocked(MatchesRepository.updateMatchStatus).mockResolvedValue(true as never);
      const response = await request(app).patch(`/matches/${validUuid}/reject`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should save match", async () => {
      vi.mocked(MatchesRepository.updateMatchStatus).mockResolvedValue(true as never);
      const response = await request(app).patch(`/matches/${validUuid}/save`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /:id", () => {
    const validUuid = "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5";

    it("should remove match", async () => {
      vi.mocked(MatchesRepository.updateMatchStatus).mockResolvedValue(true as never);
      const response = await request(app).delete(`/matches/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
});
