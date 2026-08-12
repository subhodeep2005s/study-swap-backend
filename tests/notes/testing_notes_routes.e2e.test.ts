import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { pool, query } from "@/config/db";
import { generateToken } from "@/core/utils/jwt";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const app = createApp();

const MEDIA_DIR = path.resolve(__dirname, "../../test_media");
const PDF_PATH = path.join(MEDIA_DIR, "launchecommerce.pdf");
function fileSize(filePath: string) {
  return fs.statSync(filePath).size;
}

// Global tokens & IDs
let studentToken: string;
let mentorToken: string;
let adminToken: string;

let studentId: string;
let mentorId: string;
let adminId: string;

let countryId: string;
let examId: string;

let studentNoteId: string;
let mentorNoteId: string;

// Helper to log verbose steps
function logStep(role: string, stepNum: string, stepName: string, method: string, url: string, status: number, resultMsg: string) {
  const isPass = (status >= 200 && status < 400) ? "✅ PASS" : (status >= 400 ? "⚠️ EXPECTED ERROR / ❌ FAIL" : "❌ FAIL");
  console.log(`\n==================================================`);
  console.log(`[${stepNum}] ${role}: ${stepName}`);
  console.log(`METHOD: ${method}`);
  console.log(`ACTUAL URL: ${url}`);
  console.log(`HTTP STATUS: ${status}`);
  console.log(`${isPass}`);
  console.log(`IMPORTANT RESULT: ${resultMsg}`);
}

describe("📚 STUDYSWAP NOTES HUB E2E (Verbose Logging)", () => {
  beforeAll(async () => {
    console.log(`\n==================================================`);
    console.log(`📚 STUDYSWAP NOTES HUB E2E - INITIALIZING`);
    console.log(`==================================================\n`);
    
    // Create taxonomy
    await query("TRUNCATE TABLE users CASCADE");
    await query("TRUNCATE TABLE countries CASCADE");

    const countryRes = await query("INSERT INTO countries (name) VALUES ('India') RETURNING id");
    countryId = countryRes.rows[0].id;

    const examRes = await query(
      "INSERT INTO education_nodes (name, node_type, country_id) VALUES ('JEE Main', 'EXAM', $1) RETURNING id",
      [countryId]
    );
    examId = examRes.rows[0].id;

    // Admin
    const adminRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('admin_e2e@notes.com', 'admin', true, true) RETURNING id"
    );
    adminId = adminRes.rows[0].id;
    adminToken = generateToken({ id: adminId, email: "admin_e2e@notes.com", role: "admin" });

    // Student
    const studentRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('student_e2e@notes.com', 'student', true, true) RETURNING id"
    );
    studentId = studentRes.rows[0].id;
    studentToken = generateToken({ id: studentId, email: "student_e2e@notes.com", role: "student" });
    await query("INSERT INTO profiles (user_id, country_id) VALUES ($1, $2)", [studentId, countryId]);
    await query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [studentId, examId]);

    // Mentor
    const mentorRes = await query(
      "INSERT INTO users (email, role, email_verified, onboarding_completed) VALUES ('mentor_e2e@notes.com', 'mentor', true, true) RETURNING id"
    );
    mentorId = mentorRes.rows[0].id;
    mentorToken = generateToken({ id: mentorId, email: "mentor_e2e@notes.com", role: "mentor" });
    await query("INSERT INTO mentors (user_id) VALUES ($1)", [mentorId]);
    await query("INSERT INTO profiles (user_id, country_id) VALUES ($1, $2)", [mentorId, countryId]);
    await query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [mentorId, examId]);
  });

  afterAll(async () => {
    await query("TRUNCATE TABLE users CASCADE");
    await query("TRUNCATE TABLE countries CASCADE");
    await pool.end();
  });

  // ── STUDENT FLOW ──────────────────────────────────────────
  describe("👤 STUDENT FLOW", () => {
    it("should get presigned url and upload note", async () => {
      let res = await request(app).post("/notes/presigned-url").set("Authorization", `Bearer ${studentToken}`).send({ fileName: "student.pdf", contentType: "application/pdf" });
      logStep("STUDENT", "01", "GET PRESIGNED URL", "POST", "/notes/presigned-url", res.status, `Got URL: ${res.body.data?.uploadUrl?.substring(0,20)}...`);
      expect(res.status).toBe(200);
      
      const payload = {
        title: "Student E2E Note",
        noteType: "LECTURE_NOTES",
        educationNodeIds: [examId],
        countryId,
        fileKey: `notes/student-${Date.now()}.pdf`,
        mimeType: "application/pdf",
        fileSize: fileSize(PDF_PATH),
        fileHash: crypto.randomBytes(32).toString("hex"),
      };
      res = await request(app).post("/notes").set("Authorization", `Bearer ${studentToken}`).send(payload);
      studentNoteId = res.body.data?.id;
      logStep("STUDENT", "02", "CREATE NOTE", "POST", "/notes", res.status, `UPLOAD SUCCESS | Note ID: ${studentNoteId} | Exam ID: ${examId}`);
      expect(res.status).toBe(201);
      expect(studentNoteId).toBeTruthy();
      
      // Verification of file_url and thumbnail_url abstraction
      expect(res.body.data.file_url).toBeTruthy();
      // thumbnail might be null or string depending on pdf processing success, but key shouldn't be exposed
      expect(res.body.data.file_key).toBeUndefined();
      expect(res.body.data.thumbnail_key).toBeUndefined();
    });

    it("should browse and filter notes", async () => {
      let res = await request(app).get("/notes").set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "03", "BROWSE ALL", "GET", "/notes", res.status, `Found ${res.body.data?.items?.length} notes`);
      expect(res.status).toBe(200);

      res = await request(app).get(`/notes?educationNodeId=${examId}`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "04", "FILTER EXAM", "GET", `/notes?educationNodeId=${examId}`, res.status, `Found ${res.body.data?.items?.length} notes`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      
      res = await request(app).get(`/notes?countryId=${countryId}`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "05", "FILTER COUNTRY", "GET", `/notes?countryId=${countryId}`, res.status, `Found ${res.body.data?.items?.length} notes`);
      expect(res.status).toBe(200);
    });

    it("should view note, save, unsave, rate", async () => {
      let res = await request(app).get(`/notes/${studentNoteId}`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "06", "VIEW NOTE", "GET", `/notes/${studentNoteId}`, res.status, `Title: ${res.body.data?.title}`);
      expect(res.status).toBe(200);
      expect(res.body.data.file_url).toBeTruthy();
      expect(res.body.data.file_key).toBeUndefined();

      res = await request(app).post(`/notes/${studentNoteId}/save`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "07", "SAVE NOTE", "POST", `/notes/${studentNoteId}/save`, res.status, `Saved: true`);
      expect(res.status).toBe(200);

      res = await request(app).get(`/notes/saved`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "08", "GET SAVED", "GET", `/notes/saved`, res.status, `Total Saved: ${res.body.data?.items?.length}`);
      expect(res.status).toBe(200);

      res = await request(app).delete(`/notes/${studentNoteId}/save`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "09", "UNSAVE NOTE", "DELETE", `/notes/${studentNoteId}/save`, res.status, `Unsaved: true`);
      expect(res.status).toBe(200);

      res = await request(app).post(`/notes/${studentNoteId}/rating`).set("Authorization", `Bearer ${studentToken}`).send({ rating: 5 });
      logStep("STUDENT", "10", "RATE NOTE", "POST", `/notes/${studentNoteId}/rating`, res.status, `Rating: 5 stars`);
      expect(res.status).toBe(200);
      expect(res.body.data?.average_rating).toBe("5.00");
    });
    
    it("should view my notes, edit, delete and restore", async () => {
      let res = await request(app).get("/notes/me").set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "11", "MY NOTES", "GET", "/notes/me", res.status, `Found: ${res.body.data?.items?.length} notes`);
      expect(res.status).toBe(200);

      res = await request(app).patch(`/notes/${studentNoteId}`).set("Authorization", `Bearer ${studentToken}`).send({ title: "Edited Title" });
      logStep("STUDENT", "12", "EDIT NOTE", "PATCH", `/notes/${studentNoteId}`, res.status, `New Title: ${res.body.data?.title}`);
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Edited Title");

      res = await request(app).delete(`/notes/${studentNoteId}`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "13", "DELETE NOTE", "DELETE", `/notes/${studentNoteId}`, res.status, `Deleted successfully`);
      expect(res.status).toBe(200);

      res = await request(app).get("/notes").set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "14", "VERIFY DELETED NOTE MISSING", "GET", "/notes", res.status, `Notes count: ${res.body.data?.items?.length}`);
      const found = res.body.data.items.find((n: any) => n.id === studentNoteId);
      expect(found).toBeUndefined();

      res = await request(app).post(`/notes/${studentNoteId}/restore`).set("Authorization", `Bearer ${studentToken}`);
      logStep("STUDENT", "15", "RESTORE NOTE", "POST", `/notes/${studentNoteId}/restore`, res.status, `Restored successfully`);
      expect(res.status).toBe(200);
    });
  });

  // ── MENTOR FLOW ──────────────────────────────────────────
  describe("🧑‍🏫 MENTOR FLOW", () => {
    it("should upload note, verify mentor cannot edit student note", async () => {
      const payload = {
        title: "Mentor E2E Note",
        noteType: "REVISION_NOTES",
        educationNodeIds: [examId],
        countryId,
        fileKey: `notes/mentor-${Date.now()}.pdf`,
        mimeType: "application/pdf",
        fileSize: fileSize(PDF_PATH),
        fileHash: crypto.randomBytes(32).toString("hex"),
      };
      let res = await request(app).post("/notes").set("Authorization", `Bearer ${mentorToken}`).send(payload);
      mentorNoteId = res.body.data?.id;
      logStep("MENTOR", "01", "CREATE NOTE", "POST", "/notes", res.status, `UPLOAD SUCCESS | Note ID: ${mentorNoteId}`);
      expect(res.status).toBe(201);
      expect(mentorNoteId).toBeTruthy();

      res = await request(app).patch(`/notes/${studentNoteId}`).set("Authorization", `Bearer ${mentorToken}`).send({ title: "Hack" });
      logStep("MENTOR", "02", "TRY EDIT STUDENT NOTE", "PATCH", `/notes/${studentNoteId}`, res.status, `Rejected editing another user's note`);
      expect([403, 404]).toContain(res.status);
    });
  });

  // ── ADMIN FLOW ──────────────────────────────────────────
  describe("🛡️ ADMIN FLOW", () => {
    it("should browse all, edit any note, feature and delete permanently", async () => {
      let res = await request(app).get("/admin/notes").set("Authorization", `Bearer ${adminToken}`);
      logStep("ADMIN", "01", "BROWSE ADMIN", "GET", "/admin/notes", res.status, `Total Notes: ${res.body.data?.items?.length}`);
      expect(res.status).toBe(200);

      res = await request(app).patch(`/admin/notes/${studentNoteId}`).set("Authorization", `Bearer ${adminToken}`).send({ status: "HIDDEN" });
      if (res.status !== 200) console.log("ADMIN EDIT ERROR:", JSON.stringify(res.body, null, 2));
      logStep("ADMIN", "02", "EDIT STUDENT NOTE", "PATCH", `/admin/notes/${studentNoteId}`, res.status, `Status changed to: ${res.body.data?.status}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("HIDDEN");

      res = await request(app).post(`/notes/${studentNoteId}/feature`).set("Authorization", `Bearer ${adminToken}`);
      logStep("ADMIN", "03", "FEATURE NOTE", "POST", `/notes/${studentNoteId}/feature`, res.status, `Note Featured: true`);
      expect(res.status).toBe(200);

      res = await request(app).delete(`/admin/notes/${mentorNoteId}`).set("Authorization", `Bearer ${adminToken}`);
      logStep("ADMIN", "04", "PERMANENT DELETE MENTOR NOTE", "DELETE", `/admin/notes/${mentorNoteId}`, res.status, `Deleted successfully`);
      expect(res.status).toBe(200);
      
      const check = await query("SELECT id FROM notes WHERE id = $1", [mentorNoteId]);
      expect(check.rows.length).toBe(0);
    });
  });

  // ── ERROR & SECURITY TESTS ────────────────────────────────
  describe("🔒 SECURITY & ERROR CASES", () => {
    it("should reject duplicate hash", async () => {
      const payload = {
        title: "Duplicate",
        noteType: "REVISION_NOTES",
        educationNodeIds: [examId],
        fileKey: `notes/duplicate.pdf`,
        mimeType: "application/pdf",
        fileSize: 100,
        fileHash: crypto.randomBytes(32).toString("hex"),
      };
      await request(app).post("/notes").set("Authorization", `Bearer ${studentToken}`).send(payload); // 1st success
      
      const res = await request(app).post("/notes").set("Authorization", `Bearer ${studentToken}`).send(payload); // 2nd fail
      logStep("SECURITY", "01", "DUPLICATE PROTECT", "POST", "/notes", res.status, `Status: ${res.status}`);
      expect(res.status).toBe(409);
    });

    it("should reject without educationNodeIds", async () => {
      const payload = {
        title: "No Context",
        noteType: "REVISION_NOTES",
        fileKey: `notes/nocontext.pdf`,
        mimeType: "application/pdf",
        fileSize: 100,
        fileHash: crypto.randomBytes(32).toString("hex"),
      };
      const res = await request(app).post("/notes").set("Authorization", `Bearer ${studentToken}`).send(payload);
      logStep("SECURITY", "02", "MISSING TAXONOMY", "POST", "/notes", res.status, `Status: ${res.status}`);
      expect(res.status).toBe(400);
    });
  });
});
