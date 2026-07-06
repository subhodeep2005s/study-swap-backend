

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
import { CountriesRepository } from "../../src/modules/countries/countries.repository";

vi.mock("../../src/modules/countries/countries.repository", () => ({
  CountriesRepository: {
    getCountries: vi.fn(),
  },
}));

const app = createApp();

describe("Countries Module Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /countries", () => {
    it("should return a list of countries", async () => {
      vi.mocked(CountriesRepository.getCountries).mockResolvedValue([
        { id: "1", name: "India", flag: "🇮🇳", iso_code: "IN" },
        { id: "2", name: "United States", flag: "🇺🇸", iso_code: "US" },
      ]);

      const response = await request(app).get("/countries");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].name).toBe("India");
    });
  });

  describe("GET /countries/:countryCode/states", () => {
    it("should return a list of states for a country code (using generic logic if no DB call)", async () => {
      // Assuming countries controller handles static states or external API
      const response = await request(app).get("/countries/IN/states");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
