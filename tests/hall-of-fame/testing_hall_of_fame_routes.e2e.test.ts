import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "@/app";
import { pool, query } from "@/config/db";
import { generateToken } from "@/core/utils/jwt";
import crypto from "crypto";

const app = createApp();

let studentToken: string;
let mentorToken: string;
let adminToken: string;

let studentId: string;
let student2Id: string;
let mentorId: string;
let adminId: string;
let student2Token: string;

let countryId: string;
let educationNodeId: string;

let draftStoryId: string;
let publishedStoryId: string;
let commentId: string;

beforeAll(async () => {
  // 1. Setup users
  studentId = crypto.randomUUID();
  student2Id = crypto.randomUUID();
  mentorId = crypto.randomUUID();
  adminId = crypto.randomUUID();

  const ts = Date.now();
  const eStudent = `student_hof_${ts}@test.com`;
  const eStudent2 = `student2_hof_${ts}@test.com`;
  const eMentor = `mentor_hof_${ts}@test.com`;
  const eAdmin = `admin_hof_${ts}@test.com`;

  // Create users
  await query(
    "INSERT INTO users (id, email, role) VALUES ($1, $2, 'student'), ($3, $4, 'student'), ($5, $6, 'mentor'), ($7, $8, 'admin')",
    [studentId, eStudent, student2Id, eStudent2, mentorId, eMentor, adminId, eAdmin]
  );

  // Generate tokens
  studentToken = generateToken({ id: studentId, email: eStudent, role: "student" });
  student2Token = generateToken({ id: student2Id, email: eStudent2, role: "student" });
  mentorToken = generateToken({ id: mentorId, email: eMentor, role: "mentor" });
  adminToken = generateToken({ id: adminId, email: eAdmin, role: "admin" });

  // 2. Setup Country and Education Node
  const countryRes = await query("INSERT INTO countries (name, iso_code) VALUES ('India_HOF_Test', 'IX') RETURNING id");
  countryId = countryRes.rows[0].id;

  const nodeRes = await query("INSERT INTO education_nodes (country_id, name, node_type) VALUES ($1, 'JEE Main HOF Test', 'EXAM') RETURNING id", [countryId]);
  educationNodeId = nodeRes.rows[0].id;
  
  // Set student 1 education node to recommend it later
  await query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [studentId, educationNodeId]);
  await query("INSERT INTO profiles (user_id, full_name, country_id) VALUES ($1, 'Student HOF', $2)", [studentId, countryId]);
});

afterAll(async () => {
  // Cleanup
  await query("DELETE FROM hall_of_fame WHERE admin_id = $1", [adminId]);
  await query("DELETE FROM users WHERE id IN ($1, $2, $3, $4)", [studentId, student2Id, mentorId, adminId]);
  await query("DELETE FROM countries WHERE id = $1", [countryId]); 
  await pool.end();
});

describe("==================================================\n🏆 STUDYSWAP HALL OF FAME E2E\n==================================================", () => {
  
  describe("ADMIN FLOW", () => {
    it("[01] ADMIN LOGIN (Simulation)", () => {
      console.log("[01] ADMIN LOGIN\n✅ PASS");
      expect(adminToken).toBeDefined();
    });

    it("[02] RESOLVE INDIA", () => {
      console.log(`[02] RESOLVE INDIA\n✅ PASS\nCountry ID: ${countryId}`);
      expect(countryId).toBeDefined();
    });

    it("[03] RESOLVE JEE MAIN", () => {
      console.log(`[03] RESOLVE JEE MAIN\n✅ PASS\nEducation Node ID: ${educationNodeId}`);
      expect(educationNodeId).toBeDefined();
    });

    it("[04] CREATE DRAFT", async () => {
      const res = await request(app)
        .post("/admin/hall-of-fame")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "From 72% to 96.3%",
          short_description: "A JEE comeback journey",
          story: "Complete story...",
          person_name: "Rahul Kumar",
          person_role: "Student",
          country_id: countryId,
          education_node_ids: [educationNodeId],
          achievement_type: "EXAM_CLEARED",
          achievement_year: 2026,
          result_label: "Percentile",
          result_before: "72%",
          result_after: "96.3%",
          is_featured: false,
          status: "DRAFT"
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      draftStoryId = res.body.data.id;
      
      console.log(`[04] CREATE DRAFT\nPOST /admin/hall-of-fame\n✅ PASS\nStory ID: ${draftStoryId}`);
    });
    
    it("Admin list includes draft", async () => {
      const res = await request(app)
        .get("/admin/hall-of-fame")
        .set("Authorization", `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.find((s: any) => s.id === draftStoryId)).toBeDefined();
    });
    
    it("Update draft", async () => {
      const res = await request(app)
        .patch(`/admin/hall-of-fame/${draftStoryId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "From 72% to 97%"
        });
        
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("From 72% to 97%");
    });

    it("[05] PUBLISH", async () => {
      const res = await request(app)
        .post(`/admin/hall-of-fame/${draftStoryId}/publish`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      publishedStoryId = draftStoryId;
      
      console.log(`[05] PUBLISH\nPOST /admin/hall-of-fame/:id/publish\n✅ PASS`);
    });
    
    it("Feature story", async () => {
      const res = await request(app)
        .post(`/admin/hall-of-fame/${publishedStoryId}/feature`)
        .set("Authorization", `Bearer ${adminToken}`);
        
      expect(res.status).toBe(200);
    });
    
    it("Create another story for 2015", async () => {
      await request(app)
        .post("/admin/hall-of-fame")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Old story",
          story: "Complete story...",
          person_name: "Amit",
          country_id: countryId,
          education_node_ids: [educationNodeId],
          achievement_type: "EXAM_CLEARED",
          achievement_year: 2015,
          status: "PUBLISHED"
        });
    });
  });

  describe("STUDENT FLOW", () => {
    it("[06] BROWSE", async () => {
      const res = await request(app)
        .get("/hall-of-fame")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      
      // Drafts should not appear (since we published all, let's create a new draft)
      const draftRes = await request(app)
        .post("/admin/hall-of-fame")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Hidden Draft",
          story: "Secret story content",
          person_name: "Secret Person",
          country_id: countryId,
          education_node_ids: [educationNodeId],
          achievement_type: "OTHER",
          achievement_year: 2026,
          status: "DRAFT"
        });
        
      const browseRes = await request(app)
        .get("/hall-of-fame")
        .set("Authorization", `Bearer ${studentToken}`);
        
      expect(browseRes.body.data.find((s: any) => s.id === draftRes.body.data.id)).toBeUndefined();
      
      console.log(`[06] BROWSE\nGET /hall-of-fame\n✅ PASS\nStories: ${browseRes.body.data.length}`);
    });

    it("[07] FILTER YEAR 2026", async () => {
      const res = await request(app)
        .get("/hall-of-fame?achievement_year=2026")
        .set("Authorization", `Bearer ${studentToken}`);
        
      expect(res.status).toBe(200);
      for (const story of res.body.data) {
        expect(story.achievement_year).toBe(2026);
      }
      console.log(`[07] FILTER YEAR 2026\nGET /hall-of-fame?achievement_year=2026\n✅ PASS`);
    });

    it("[08] FILTER YEAR 2015", async () => {
      const res = await request(app)
        .get("/hall-of-fame?achievement_year=2015")
        .set("Authorization", `Bearer ${studentToken}`);
        
      expect(res.status).toBe(200);
      for (const story of res.body.data) {
        expect(story.achievement_year).toBe(2015);
      }
      console.log(`[08] FILTER YEAR 2015\nGET /hall-of-fame?achievement_year=2015\n✅ PASS`);
    });
    
    it("Filter invalid year returns validation error", async () => {
      const res = await request(app).get("/hall-of-fame?achievement_year=abc");
      expect(res.status).toBe(400);
    });

    it("[09] VIEW", async () => {
      const res = await request(app)
        .post(`/hall-of-fame/${publishedStoryId}/view`)
        .set("Authorization", `Bearer ${studentToken}`);
        
      expect(res.status).toBe(200);
      console.log(`[09] VIEW\nPOST /hall-of-fame/:id/view\n✅ PASS`);
    });

    it("[10] LIKE", async () => {
      const res = await request(app)
        .post(`/hall-of-fame/${publishedStoryId}/like`)
        .set("Authorization", `Bearer ${studentToken}`);
        
      expect(res.status).toBe(200);
      
      // Attempt duplicate like
      await request(app).post(`/hall-of-fame/${publishedStoryId}/like`).set("Authorization", `Bearer ${studentToken}`);
      
      // Verify count in DB via detail
      const detailRes = await request(app).get(`/hall-of-fame/${publishedStoryId}`).set("Authorization", `Bearer ${studentToken}`);
      expect(detailRes.body.data.likes_count).toBe(1);
      expect(detailRes.body.data.viewer.liked).toBe(true);
      
      console.log(`[10] LIKE\nPOST /hall-of-fame/:id/like\n✅ PASS`);
    });
    
    it("UNLIKE", async () => {
      const res = await request(app)
        .delete(`/hall-of-fame/${publishedStoryId}/like`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      
      const detailRes = await request(app).get(`/hall-of-fame/${publishedStoryId}`).set("Authorization", `Bearer ${studentToken}`);
      expect(detailRes.body.data.likes_count).toBe(0);
      expect(detailRes.body.data.viewer.liked).toBe(false);
    });
    
    it("HELPFUL", async () => {
      const res = await request(app)
        .post(`/hall-of-fame/${publishedStoryId}/helpful`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      
      const detailRes = await request(app).get(`/hall-of-fame/${publishedStoryId}`).set("Authorization", `Bearer ${studentToken}`);
      expect(detailRes.body.data.helpful_count).toBe(1);
      expect(detailRes.body.data.viewer.helpful).toBe(true);
    });
    
    it("SAVE", async () => {
      const res = await request(app)
        .post(`/hall-of-fame/${publishedStoryId}/save`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      
      const savedRes = await request(app).get(`/hall-of-fame/saved`).set("Authorization", `Bearer ${studentToken}`);
      expect(savedRes.body.data.length).toBeGreaterThanOrEqual(1);
      
      await request(app).delete(`/hall-of-fame/${publishedStoryId}/save`).set("Authorization", `Bearer ${studentToken}`);
    });
  });

  describe("COMMENTS", () => {
    it("Student A create comment", async () => {
      const res = await request(app)
        .post(`/hall-of-fame/${publishedStoryId}/comments`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ content: "Very inspiring!" });
        
      expect(res.status).toBe(201);
      commentId = res.body.data.id;
    });
    
    it("Student A edit own comment", async () => {
      const res = await request(app)
        .patch(`/hall-of-fame/comments/${commentId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ content: "Very inspiring updated!" });
      expect(res.status).toBe(200);
    });
    
    it("Student B attempt to edit Student A comment", async () => {
      const res = await request(app)
        .patch(`/hall-of-fame/comments/${commentId}`)
        .set("Authorization", `Bearer ${student2Token}`)
        .send({ content: "Hacked!" });
      expect(res.status).toBe(403);
    });
    
    it("Admin delete comment", async () => {
      const res = await request(app)
        .delete(`/admin/hall-of-fame/comments/${commentId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("SECURITY AND DELETION", () => {
    it("Student cannot access admin route", async () => {
      const res = await request(app)
        .post("/admin/hall-of-fame")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({});
      expect(res.status).toBe(403);
    });
    
    it("Admin delete story", async () => {
      const res = await request(app)
        .delete(`/admin/hall-of-fame/${publishedStoryId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      
      // Should not be visible to students
      const pubRes = await request(app)
        .get(`/hall-of-fame/${publishedStoryId}`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(pubRes.status).toBe(404);
    });
    
    it("Admin restore story", async () => {
      const res = await request(app)
        .post(`/admin/hall-of-fame/${publishedStoryId}/restore`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      
      // Need to publish it again since it becomes ARCHIVED when deleted
      await request(app)
        .post(`/admin/hall-of-fame/${publishedStoryId}/publish`)
        .set("Authorization", `Bearer ${adminToken}`);
      
      // Should be visible again
      const pubRes = await request(app)
        .get(`/hall-of-fame/${publishedStoryId}`)
        .set("Authorization", `Bearer ${studentToken}`);
      expect(pubRes.status).toBe(200);
    });
  });

  describe("OTHER REQUIRED ROUTES", () => {
    it("GET /hall-of-fame/featured", async () => {
      const res = await request(app).get("/hall-of-fame/featured");
      expect(res.status).toBe(200);
    });
    
    it("GET /hall-of-fame/trending", async () => {
      const res = await request(app).get("/hall-of-fame/trending");
      expect(res.status).toBe(200);
    });
    
    it("GET /hall-of-fame/recommended", async () => {
      const res = await request(app).get("/hall-of-fame/recommended").set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
    });
    
    it("GET /hall-of-fame/filters", async () => {
      const res = await request(app).get("/hall-of-fame/filters");
      expect(res.status).toBe(200);
      expect(res.body.data.years).toBeDefined();
    });
    
    it("GET /admin/hall-of-fame/stats", async () => {
      const res = await request(app).get("/admin/hall-of-fame/stats").set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.total_stories).toBeDefined();
    });
  });
});
