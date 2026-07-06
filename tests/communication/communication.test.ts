

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
import { CommunicationRepository } from "../../src/modules/communication/communication.repository";

vi.mock("../../src/modules/communication/communication.socket", () => ({
  getIO: vi.fn().mockReturnValue({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })
}));

vi.mock("../../src/modules/communication/communication.repository", () => ({
  CommunicationRepository: {
    getConversationsList: vi.fn(),
    getConversation: vi.fn(),
    getMessagesCursor: vi.fn(),
    saveMessage: vi.fn(),
    saveAttachment: vi.fn(),
    updateConversationLastMessage: vi.fn(),
    markMessagesRead: vi.fn(),
    getAttachmentsCursor: vi.fn(),
    getMessageById: vi.fn(),
    updateMessageText: vi.fn(),
    updateMessageDeleted: vi.fn(),
    getCallHistory: vi.fn(),
    getActiveCall: vi.fn(),
    createCall: vi.fn(),
    getCallByIdForUpdate: vi.fn(),
    updateCallStatus: vi.fn(),
    getFocusHistory: vi.fn(),
    getActiveFocus: vi.fn(),
    createFocus: vi.fn(),
    getFocusByIdForUpdate: vi.fn(),
    updateFocusStatus: vi.fn(),
    validateMatchAndGetPartner: vi.fn(),
    validateMembership: vi.fn(),
  }
}));

const app = createApp();

describe("Communication Module Integration Tests", () => {
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

    vi.mocked(CommunicationRepository.validateMembership).mockResolvedValue(true);
    vi.mocked(CommunicationRepository.validateMatchAndGetPartner).mockResolvedValue({
      status: "accepted",
      user_id: "user-123",
      matched_user_id: "partner-123"
    } as any);
  });

  describe("Conversations", () => {
    it("should get conversations list", async () => {
      vi.mocked(CommunicationRepository.getConversationsList).mockResolvedValue([] as any);
      const response = await request(app).get("/communication/conversations").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get conversation by id", async () => {
      vi.mocked(CommunicationRepository.getConversation).mockResolvedValue({ id: validUuid, users: [{ id: "user-123" }] } as any);
      const response = await request(app).get(`/communication/conversations/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Messages", () => {
    it("should get messages", async () => {
      vi.mocked(CommunicationRepository.getMessagesCursor).mockResolvedValue({ messages: [], nextCursor: null });
      const response = await request(app).get(`/communication/conversations/${validUuid}/messages`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should send message", async () => {
      vi.mocked(CommunicationRepository.saveMessage).mockResolvedValue({ id: validUuid } as any);
      vi.mocked(CommunicationRepository.updateConversationLastMessage).mockResolvedValue();
      const response = await request(app)
        .post(`/communication/conversations/${validUuid}/messages`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ message: "Hello", messageType: "TEXT" });
      expect(response.status).toBe(201);
    });

    it("should mark messages as read", async () => {
      vi.mocked(CommunicationRepository.markMessagesRead).mockResolvedValue(1);
      const response = await request(app)
        .patch(`/communication/conversations/${validUuid}/read`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get attachments", async () => {
      vi.mocked(CommunicationRepository.getAttachmentsCursor).mockResolvedValue({ attachments: [], nextCursor: null } as any);
      const response = await request(app)
        .get(`/communication/conversations/${validUuid}/attachments`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should edit message", async () => {
      vi.mocked(CommunicationRepository.getMessageById).mockResolvedValue({ id: validUuid, sender_id: "user-123", conversation_id: validUuid, message_type: "TEXT" } as any);
      vi.mocked(CommunicationRepository.updateMessageText).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/communication/messages/${validUuid}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ message: "Edited" });
      expect(response.status).toBe(200);
    });

    it("should delete message", async () => {
      vi.mocked(CommunicationRepository.getMessageById).mockResolvedValue({ id: validUuid, sender_id: "user-123", conversation_id: validUuid, message_type: "TEXT" } as any);
      vi.mocked(CommunicationRepository.updateMessageDeleted).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .delete(`/communication/messages/${validUuid}`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Calls", () => {
    it("should get call history", async () => {
      vi.mocked(CommunicationRepository.getCallHistory).mockResolvedValue({ calls: [], nextCursor: null });
      const response = await request(app)
        .get(`/communication/conversations/${validUuid}/calls`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should start call", async () => {
      vi.mocked(CommunicationRepository.getActiveCall).mockResolvedValue(null);
      vi.mocked(CommunicationRepository.createCall).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .post("/communication/calls")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ conversationId: validUuid, type: "VOICE" });
      expect(response.status).toBe(201);
    });

    it("should accept call", async () => {
      vi.mocked(CommunicationRepository.getCallByIdForUpdate).mockResolvedValue({ id: validUuid, caller_id: "partner-123", conversation_id: validUuid, status: "ringing" } as any);
      vi.mocked(CommunicationRepository.updateCallStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/communication/calls/${validUuid}/accept`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should end call", async () => {
      vi.mocked(CommunicationRepository.getCallByIdForUpdate).mockResolvedValue({ id: validUuid, caller_id: "partner-123", conversation_id: validUuid, status: "active" } as any);
      vi.mocked(CommunicationRepository.updateCallStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/communication/calls/${validUuid}/end`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Focus", () => {
    it("should get focus history", async () => {
      vi.mocked(CommunicationRepository.getFocusHistory).mockResolvedValue({ sessions: [], nextCursor: null });
      const response = await request(app)
        .get(`/communication/conversations/${validUuid}/focus`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should start focus", async () => {
      vi.mocked(CommunicationRepository.getActiveFocus).mockResolvedValue(null);
      vi.mocked(CommunicationRepository.createFocus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .post("/communication/focus")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ conversationId: validUuid, durationSeconds: 1500 });
      expect(response.status).toBe(201);
    });

    it("should accept focus", async () => {
      vi.mocked(CommunicationRepository.getFocusByIdForUpdate).mockResolvedValue({ id: validUuid, initiator_id: "partner-123", conversation_id: validUuid, status: "pending", duration_seconds: 1500 } as any);
      vi.mocked(CommunicationRepository.updateFocusStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/communication/focus/${validUuid}/accept`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should end focus", async () => {
      vi.mocked(CommunicationRepository.getFocusByIdForUpdate).mockResolvedValue({ id: validUuid, initiator_id: "partner-123", conversation_id: validUuid, status: "active" } as any);
      vi.mocked(CommunicationRepository.updateFocusStatus).mockResolvedValue({ id: validUuid } as any);
      const response = await request(app)
        .patch(`/communication/focus/${validUuid}/end`)
        .set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
});
