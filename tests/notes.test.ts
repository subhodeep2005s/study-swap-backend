import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { pool, query } from "@/config/db";
import { generateToken } from "@/core/utils/jwt";
import crypto from "crypto";

const app = createApp();

describe("Notes Hub Module (Integration Tests)", () => {
  let studentToken: string;
  let mentorToken: string;
  let adminToken: string;
  let studentId: string;
  let mentorId: string;
  let adminId: string;
  let countryId: string;
  let examId: string;

  beforeAll(async () => {
    // Clean up
    await query("TRUNCATE TABLE users CASCADE");
    await query("TRUNCATE TABLE countries CASCADE");

    // Setup Country and Exam
    const countryRes = await query("INSERT INTO countries (name) VALUES ('India') RETURNING id");
    countryId = countryRes.rows[0].id;

    const examRes = await query("INSERT INTO education_nodes (name, node_type, country_id) VALUES ('JEE Main', 'EXAM', $1) RETURNING id", [countryId]);
    examId = examRes.rows[0].id;

    // Create Admin (Admins bypass DB check in auth middleware, but we need them in users for FK)
    const adminRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('admin@test.com', 'student', true, true) RETURNING id"
    );
    adminId = adminRes.rows[0].id;
    adminToken = generateToken({ id: adminId, email: "admin@test.com", role: "admin" });

    // Create Student
    const studentRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('student@test.com', 'student', true, true) RETURNING id"
    );
    studentId = studentRes.rows[0].id;
    studentToken = generateToken({ id: studentId, email: "student@test.com", role: "student" });
    await query("INSERT INTO profiles (user_id, country_id) VALUES ($1, $2)", [studentId, countryId]);
    await query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [studentId, examId]);

    // Create Mentor
    const mentorRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('mentor@test.com', 'mentor', true, true) RETURNING id"
    );
    mentorId = mentorRes.rows[0].id;
    mentorToken = generateToken({ id: mentorId, email: "mentor@test.com", role: "mentor" });
    await query("INSERT INTO mentors (user_id) VALUES ($1)", [mentorId]);
    await query("INSERT INTO profiles (user_id, country_id) VALUES ($1, $2)", [mentorId, countryId]);
    await query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [mentorId, examId]);
  });

  afterAll(async () => {
    await query("TRUNCATE TABLE users CASCADE");
    await query("TRUNCATE TABLE countries CASCADE");
    await pool.end();
  });

  describe("Upload Notes", () => {
    it("should allow student to upload note for matching exam", async () => {
      const res = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "My Physics Notes",
          noteType: "SHORT_NOTES",
          examId,
          countryId,
          fileKey: "some_s3_key",
          mimeType: "application/pdf",
          fileSize: 1024,
          fileHash: crypto.randomBytes(32).toString('hex')
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.uploader_id).toBe(studentId);
    });

    it("should reject student uploading for unauthorized exam", async () => {
      const randomExamRes = await query("INSERT INTO education_nodes (name, node_type, country_id) VALUES ('Random Exam', 'EXAM', $1) RETURNING id", [countryId]);
      const randomExamId = randomExamRes.rows[0].id;

      const res = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "Hacked Notes",
          noteType: "SHORT_NOTES",
          examId: randomExamId,
          countryId,
          fileKey: "some_s3_key2",
          mimeType: "application/pdf",
          fileSize: 1024,
          fileHash: crypto.randomBytes(32).toString('hex')
        });

      expect(res.status).toBe(403);
    });

    it("should block duplicate files based on hash", async () => {
      const hash = crypto.randomBytes(32).toString('hex');
      
      const res1 = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Admin Note",
          noteType: "LECTURE_NOTES",
          examId,
          fileKey: "admin_key",
          mimeType: "application/pdf",
          fileSize: 2048,
          fileHash: hash
        });
      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({
          title: "Another Note (Duplicate)",
          noteType: "LECTURE_NOTES",
          examId,
          fileKey: "mentor_key",
          mimeType: "application/pdf",
          fileSize: 2048,
          fileHash: hash
        });
      expect(res2.status).toBe(409); // Conflict
    });
  });

  describe("Note Actions", () => {
    let noteId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/notes")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "Action Notes",
          noteType: "PYQ",
          examId,
          fileKey: "action_key",
          mimeType: "application/pdf",
          fileSize: 1024,
          fileHash: crypto.randomBytes(32).toString('hex')
        });
      noteId = res.body.data.id;
    });

    it("should save a note", async () => {
      const res = await request(app).post(`/notes/${noteId}/save`).set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);

      const check = await query("SELECT saves_count FROM notes WHERE id = $1", [noteId]);
      expect(check.rows[0].saves_count).toBe(1);
    });

    it("should rate a note", async () => {
      const res = await request(app)
        .post(`/notes/${noteId}/rating`)
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({ rating: 5 });
      expect(res.status).toBe(200);
      expect(res.body.data.average_rating).toBe("5.00");
    });
    
    it("should update a rating", async () => {
      const res = await request(app)
        .patch(`/notes/${noteId}/rating`)
        .set("Authorization", `Bearer ${mentorToken}`)
        .send({ rating: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.average_rating).toBe("3.00");
    });
  });
});
