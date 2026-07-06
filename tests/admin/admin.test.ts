

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

vi.mock("../../src/modules/google/google.service", () => ({
  GoogleService: {
    isConfigured: vi.fn().mockReturnValue(true),
    createMeeting: vi.fn().mockResolvedValue({ id: "123", joinUrl: "http://meet", calendarUrl: "http://cal" }),
    deleteMeeting: vi.fn()
  }
}));

import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../../src/app";
import { query } from "../../src/config/db";
import { AdminRepository } from "../../src/modules/admin/admin.repository";
import { env } from "../../src/config/env";

vi.mock("../../src/modules/admin/admin.repository", () => ({
  AdminRepository: {
    getAdminByEmail: vi.fn(),
    getDashboardOverview: vi.fn(),
    getDashboardUserSignups: vi.fn(),
    getDashboardBookingsByStatus: vi.fn(),
    getDashboardRevenueByMonth: vi.fn(),
    getDashboardTopMentors: vi.fn(),
    getDashboardTopExams: vi.fn(),
    getCountries: vi.fn(),
    getExams: vi.fn(),
    getUsers: vi.fn(),
    getStudents: vi.fn(),
    getMentorsUsers: vi.fn(),
    getUserById: vi.fn(),
    getMatches: vi.fn(),
    getMatchesByUser: vi.fn(),
    getAuditLogs: vi.fn(),
    getAdminMentors: vi.fn(),
    getAdminMentor: vi.fn(),
    getAdminBookings: vi.fn(),
    getAdminBooking: vi.fn(),
    getMentorAvailability: vi.fn(),
    getMentorPlans: vi.fn(),
    createCountry: vi.fn(),
    updateCountry: vi.fn(),
    deleteCountry: vi.fn(),
    getExamsByCountry: vi.fn(),
    createExam: vi.fn(),
    updateExam: vi.fn(),
    deleteExam: vi.fn(),
    updateStudent: vi.fn(),
    updateMentorUser: vi.fn(),
    deleteUser: vi.fn(),
    deleteMatch: vi.fn(),
    updateBooking: vi.fn(),
    deleteBooking: vi.fn(),
    regenerateMeetLink: vi.fn(),
    updateUserTransaction: vi.fn(),
    updateAdminMentor: vi.fn(),
    deleteAdminMentor: vi.fn(),
    verifyAdminMentor: vi.fn(),
    getAdminBookingsByMentor: vi.fn(),
    updateAdminBooking: vi.fn(),
    deleteAdminBooking: vi.fn(),
    updateMentorAvailabilityTransaction: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    updateMentor: vi.fn(),
    deleteMentor: vi.fn(),
    verifyMentor: vi.fn(),
    getBookingsByMentor: vi.fn(),
    updateUserTransaction: vi.fn(),
    getBookingForMeetRegeneration: vi.fn()
  }
}));

const app = createApp();

describe("Admin Module Integration Tests", () => {
  let validToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    const jwt = require("jsonwebtoken");
    validToken = jwt.sign({ id: "admin-123", role: "admin" }, process.env.JWT_SECRET!);

    vi.mocked(query).mockResolvedValue({
      rows: [{ id: "admin-123", email: "admin@example.com", role: "admin", email_verified: true, onboarding_completed: true }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    });
  });

  describe("Auth", () => {
    it("should login admin", async () => {
      const response = await request(app)
        .post("/admin/auth/login")
        .send({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
    });

    it("should get me", async () => {
      const response = await request(app)
        .get("/admin/auth/me")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Dashboard", () => {
    it("should get dashboard", async () => {
      vi.mocked(AdminRepository.getDashboardOverview).mockResolvedValue({} as any);
      vi.mocked(AdminRepository.getDashboardUserSignups).mockResolvedValue([] as any);
      vi.mocked(AdminRepository.getDashboardBookingsByStatus).mockResolvedValue([] as any);
      vi.mocked(AdminRepository.getDashboardRevenueByMonth).mockResolvedValue([] as any);
      vi.mocked(AdminRepository.getDashboardTopMentors).mockResolvedValue([] as any);
      vi.mocked(AdminRepository.getDashboardTopExams).mockResolvedValue([] as any);
      const response = await request(app)
        .get("/admin/dashboard")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Countries", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get countries", async () => {
      vi.mocked(AdminRepository.getCountries).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/countries").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
    
    it("should create country", async () => {
      const response = await request(app).post("/admin/countries").set("Authorization", `Bearer ${validToken}`)
        .send({ name: "USA", isoCode: "US", flag: "🇺🇸" });
      expect(response.status).toBe(201);
    });

    it("should update country", async () => {
      vi.mocked(AdminRepository.updateCountry).mockResolvedValue({} as any);
      const response = await request(app).patch(`/admin/countries/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ name: "United States" });
      expect(response.status).toBe(200);
    });

    it("should delete country", async () => {
      vi.mocked(AdminRepository.deleteCountry).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/countries/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get exams by country", async () => {
      vi.mocked(AdminRepository.getExamsByCountry).mockResolvedValue([] as any);
      const response = await request(app).get(`/admin/countries/${validUuid}/exams`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Exams", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get exams", async () => {
      vi.mocked(AdminRepository.getExams).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/exams").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should create exam", async () => {
      vi.mocked(AdminRepository.createExam).mockResolvedValue({} as any);
      const response = await request(app).post("/admin/exams").set("Authorization", `Bearer ${validToken}`)
        .send({ name: "SAT", countryId: validUuid });
      expect(response.status).toBe(201);
    });

    it("should update exam", async () => {
      vi.mocked(AdminRepository.updateExam).mockResolvedValue({} as any);
      const response = await request(app).patch(`/admin/exams/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ name: "SAT Updated" });
      expect(response.status).toBe(200);
    });

    it("should delete exam", async () => {
      vi.mocked(AdminRepository.deleteExam).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/exams/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Users", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get users", async () => {
      vi.mocked(AdminRepository.getUsers).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/users").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get students", async () => {
      vi.mocked(AdminRepository.getStudents).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/users/students").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get mentors (users list)", async () => {
      vi.mocked(AdminRepository.getMentorsUsers).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/users/mentors").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get user by id", async () => {
      vi.mocked(AdminRepository.getUserById).mockResolvedValue({} as any);
      const response = await request(app).get(`/admin/users/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update student", async () => {
      vi.mocked(AdminRepository.updateUserTransaction).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/users/students/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ status: "active" });
      expect(response.status).toBe(200);
    });

    it("should update mentor user", async () => {
      vi.mocked(AdminRepository.updateUserTransaction).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/users/mentors/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ status: "active" });
      expect(response.status).toBe(200);
    });

    it("should delete user", async () => {
      vi.mocked(AdminRepository.deleteUser).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/users/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe("Mentors", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get mentors", async () => {
      vi.mocked(AdminRepository.getAdminMentors).mockResolvedValue([] as any);
      const response = await request(app).get("/admin/mentors").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get mentor by id", async () => {
      vi.mocked(AdminRepository.getAdminMentor).mockResolvedValue({} as any);
      const response = await request(app).get(`/admin/mentors/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update mentor", async () => {
      vi.mocked(AdminRepository.getAdminMentor).mockResolvedValue({ user_id: validUuid } as any);
      vi.mocked(AdminRepository.updateAdminMentor).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/mentors/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Senior Mentor" });
      expect(response.status).toBe(200);
    });

    it("should delete mentor", async () => {
      vi.mocked(AdminRepository.deleteAdminMentor).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/mentors/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should verify mentor", async () => {
      vi.mocked(AdminRepository.verifyAdminMentor).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/mentors/${validUuid}/verify`).set("Authorization", `Bearer ${validToken}`)
        .send({ isVerified: true });
      expect(response.status).toBe(200);
    });

    it("should get mentor availability", async () => {
      vi.mocked(AdminRepository.getMentorAvailability).mockResolvedValue([] as any);
      const response = await request(app).get(`/admin/mentors/${validUuid}/availability`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update mentor availability", async () => {
      vi.mocked(AdminRepository.updateMentorAvailabilityTransaction).mockResolvedValue();
      const response = await request(app).put(`/admin/mentors/${validUuid}/availability`).set("Authorization", `Bearer ${validToken}`)
        .send({ availability: [{ day_of_week: 1, start_time: "09:00:00", end_time: "17:00:00" }] });
      expect(response.status).toBe(200);
    });

    it("should get mentor plans", async () => {
      vi.mocked(AdminRepository.getMentorPlans).mockResolvedValue([] as any);
      const response = await request(app).get(`/admin/mentors/${validUuid}/plans`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update mentor plan", async () => {
      vi.mocked(AdminRepository.updatePlan).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/mentors/plans/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Updated Plan" });
      expect(response.status).toBe(200);
    });

    it("should delete mentor plan", async () => {
      vi.mocked(AdminRepository.deletePlan).mockResolvedValue({} as any);
      const response = await request(app).delete(`/admin/mentors/plans/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get mentor bookings", async () => {
      vi.mocked(AdminRepository.getAdminBookingsByMentor).mockResolvedValue([] as any);
      const response = await request(app).get(`/admin/mentors/${validUuid}/bookings`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
  
  describe("Bookings", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get bookings", async () => {
      vi.mocked(AdminRepository.getAdminBookings).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/mentors/bookings").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get booking by id", async () => {
      vi.mocked(AdminRepository.getAdminBooking).mockResolvedValue({} as any);
      const response = await request(app).get(`/admin/mentors/bookings/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should update booking", async () => {
      vi.mocked(AdminRepository.updateAdminBooking).mockResolvedValue(true as any);
      const response = await request(app).patch(`/admin/mentors/bookings/${validUuid}`).set("Authorization", `Bearer ${validToken}`)
        .send({ status: "cancelled" });
      expect(response.status).toBe(200);
    });

    it("should delete booking", async () => {
      vi.mocked(AdminRepository.deleteAdminBooking).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/mentors/bookings/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should regenerate meet link", async () => {
      vi.mocked(AdminRepository.getBookingForMeetRegeneration).mockResolvedValue({ id: validUuid, meeting_provider: "GOOGLE_MEET", student_email: "s@s.com", mentor_email: "m@m.com", start_time: new Date(), end_time: new Date() } as any);
      vi.mocked(AdminRepository.updateAdminBooking).mockResolvedValue(true as any);
      
      const response = await request(app).patch(`/admin/mentors/bookings/${validUuid}/regenerate-meet`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
  
  describe("Matches", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";

    it("should get matches", async () => {
      vi.mocked(AdminRepository.getMatches).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/matches").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should get matches by user", async () => {
      vi.mocked(AdminRepository.getMatchesByUser).mockResolvedValue([] as any);
      const response = await request(app).get(`/admin/matches/user/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });

    it("should delete match", async () => {
      vi.mocked(AdminRepository.deleteMatch).mockResolvedValue(true as any);
      const response = await request(app).delete(`/admin/matches/${validUuid}`).set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
  
  describe("Audit Logs", () => {
    it("should get audit logs", async () => {
      vi.mocked(AdminRepository.getAuditLogs).mockResolvedValue({ data: [], pagination: {} } as any);
      const response = await request(app).get("/admin/audit-logs").set("Authorization", `Bearer ${validToken}`);
      expect(response.status).toBe(200);
    });
  });
});
