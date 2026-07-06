

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
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../../src/app";
import { AuthRepository } from "../../src/modules/auth/auth.repository";
import { redis } from "../../src/config/redis";

vi.mock("../../src/modules/auth/auth.repository", () => ({
  AuthRepository: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    markEmailVerified: vi.fn(),
    updateUserRole: vi.fn(),
    updateNotificationToken: vi.fn(),
    getMe: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

import { query } from "../../src/config/db";

const mockRedis = redis as any;
const app = createApp();

describe("Auth Module Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock global DB query for authMiddleware
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "user-123", email: "test@example.com", role: "student", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("POST /auth/send-otp", () => {
    it("should send OTP for a new user", async () => {
      vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(undefined);
      
      const response = await request(app).post("/auth/send-otp").send({
        email: "test@example.com",
        role: "student",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it("should return 400 for invalid email", async () => {
      const response = await request(app).post("/auth/send-otp").send({
        email: "invalid-email",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/resend-otp", () => {
    it("should resend OTP", async () => {
      vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue({ id: "user-123", email: "test@example.com", role: "student" });
      const response = await request(app).post("/auth/resend-otp").send({ email: "test@example.com" });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled();
    });
  });

  describe("POST /auth/verify-otp", () => {
    it("should verify OTP successfully and return tokens", async () => {
      mockRedis.get.mockResolvedValue("123456");
      vi.mocked(AuthRepository.getUserByEmail).mockResolvedValue(undefined);
      vi.mocked(AuthRepository.createUser).mockResolvedValue({ id: "user-123", email: "test@example.com", role: "student", onboarding_completed: false });

      const response = await request(app).post("/auth/verify-otp").send({
        email: "test@example.com",
        otp: "123456",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined(); // Token is generated
    });

    it("should return 400 for invalid OTP", async () => {
      mockRedis.get.mockResolvedValue("wrong-otp");
      
      const response = await request(app).post("/auth/verify-otp").send({
        email: "test@example.com",
        otp: "123456",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /auth/me", () => {
    it("should return the current user", async () => {
      const jwt = require("jsonwebtoken");
      const validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

      vi.mocked(AuthRepository.getMe).mockResolvedValue({ id: "user-123", email: "test@example.com" });

      const response = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe("test@example.com");
    });
  });

  describe("PATCH /auth/notification-token", () => {
    it("should update notification token", async () => {
      const jwt = require("jsonwebtoken");
      const validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

      const response = await request(app)
        .patch("/auth/notification-token")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ notificationToken: "notif-token-123" });

      expect(response.status).toBe(200);
      expect(AuthRepository.updateNotificationToken).toHaveBeenCalledWith("user-123", "notif-token-123");
    });
  });

  describe("DELETE /auth/me", () => {
    it("should delete the current user", async () => {
      const jwt = require("jsonwebtoken");
      const validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

      const response = await request(app)
        .delete("/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(AuthRepository.deleteAccount).toHaveBeenCalledWith("user-123");
    });
  });

  describe("POST /auth/logout", () => {
    it("should handle user logout", async () => {
      const jwt = require("jsonwebtoken");
      const validToken = jwt.sign({ id: "user-123", role: "student" }, process.env.JWT_SECRET!);

      const response = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });
});
