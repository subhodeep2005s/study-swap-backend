

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

// The S3 SDK mock is globally defined in setup.ts to return a presigned URL.

const app = createApp();

describe("Uploads Module Integration Tests", () => {
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

    // Mock auth middleware query
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "student", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("POST /uploads/presigned-url", () => {
    it("should return a presigned url for a valid request", async () => {
      const response = await request(app)
        .post("/uploads/presigned-url")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          fileName: "test-image.png",
          contentType: "image/png"
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.uploadUrl).toBe("https://mock-s3-url.com/file");
      expect(response.body.data.key).toBeDefined();
    });

    it("should return 400 for invalid file type", async () => {
      const response = await request(app)
        .post("/uploads/presigned-url")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          fileName: "test-script.js",
          contentType: "application/javascript"
        });

      expect(response.status).toBe(400); // Validation error
    });
  });
});
