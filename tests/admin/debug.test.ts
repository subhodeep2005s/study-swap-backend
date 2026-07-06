import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../../src/app";
import { AdminRepository } from "../../src/modules/admin/admin.repository";

vi.mock("../../src/modules/admin/admin.repository", () => ({
  AdminRepository: {
    updateCountry: vi.fn(),
  }
}));
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

describe("debug", () => {
  it("should output", async () => {
    const jwt = require("jsonwebtoken");
    const validToken = jwt.sign({ id: "admin-123", role: "admin" }, process.env.JWT_SECRET || 'secret');
    vi.mocked(AdminRepository.updateCountry).mockResolvedValue({} as any);
    const app = createApp();
    const response = await request(app).patch(`/admin/countries/123e4567-e89b-12d3-a456-426614174000`).set("Authorization", `Bearer ${validToken}`)
      .send({ name: "United States" });
    console.log("STATUS:", response.status);
    console.log("BODY:", response.body);
    console.log("TEXT:", response.text);
  });
});
