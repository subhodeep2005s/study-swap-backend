

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
import { redis } from "../../src/config/redis";
import { StoriesRepository } from "../../src/modules/stories/stories.repository";

vi.mock("../../src/modules/stories/stories.repository", () => ({
  StoriesRepository: {
    getStoryViews: vi.fn(),
  },
}));

const app = createApp();

describe("Stories Module Integration Tests", () => {
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

    // Mock global DB query for authMiddleware
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "student", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("POST /stories", () => {
    it("should upload a story", async () => {
      const response = await request(app)
        .post("/stories")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ imageUrl: "https://mock-image.com/story.png" });

      expect(response.status).toBe(200);
      expect(redis.set).toHaveBeenCalled();
    });

    it("should return 400 for missing imageUrl", async () => {
      const response = await request(app)
        .post("/stories")
        .set("Authorization", `Bearer ${validToken}`)
        .send({}); // missing imageUrl

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /stories", () => {
    it("should delete user's story", async () => {
      const response = await request(app)
        .delete("/stories")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe("POST /stories/:userId/view", () => {
    it("should record a story view", async () => {
      vi.mocked(redis.ttl).mockResolvedValue(100); // 100 seconds remaining
      
      const response = await request(app)
        .post("/stories/b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5/view")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(redis.sadd).toHaveBeenCalledWith("story_views:b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5", "user-123");
    });

    it("should return 404 if story is expired or not found", async () => {
      vi.mocked(redis.ttl).mockResolvedValue(-1);
      
      const response = await request(app)
        .post("/stories/b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5/view")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /stories/views", () => {
    it("should return story views", async () => {
      vi.mocked(redis.smembers).mockResolvedValue(["viewer-1", "viewer-2"]);
      vi.mocked(StoriesRepository.getStoryViews).mockResolvedValue([
        { userId: "viewer-1", fullName: "Viewer One", profileImage: null }
      ]);

      const response = await request(app)
        .get("/stories/views")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });
  });
});
