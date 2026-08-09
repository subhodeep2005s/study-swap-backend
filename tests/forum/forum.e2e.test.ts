import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { getClient } from "../../src/config/db";
import { redis } from "../../src/config/redis";

const app = createApp();

describe("Anonymous Forum End-to-End Tests", () => {
  let user1Token: string;
  let user2Token: string;
  const testUser1Email = `forum1-e2e-${Date.now()}@test.com`;
  const testUser2Email = `forum2-e2e-${Date.now()}@test.com`;
  let user1Id: string;
  let user2Id: string;
  let categoryId: string;
  let postId: string;
  let commentId: string;

  beforeAll(async () => {
    // 1. Login User 1 via OTP
    await request(app).post("/auth/send-otp").send({ email: testUser1Email });
    const otp1 = await redis.get(`otp:${testUser1Email}`);
    const res1 = await request(app).post("/auth/verify-otp").send({ email: testUser1Email, otp: otp1 });
    expect(res1.status).toBe(200);
    user1Token = res1.body.data.token;
    user1Id = res1.body.data.user.id;

    // 2. Login User 2 via OTP
    await request(app).post("/auth/send-otp").send({ email: testUser2Email });
    const otp2 = await redis.get(`otp:${testUser2Email}`);
    const res2 = await request(app).post("/auth/verify-otp").send({ email: testUser2Email, otp: otp2 });
    expect(res2.status).toBe(200);
    user2Token = res2.body.data.token;
    user2Id = res2.body.data.user.id;
  });

  afterAll(async () => {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      if (user1Id) await client.query("DELETE FROM users WHERE id = $1", [user1Id]);
      if (user2Id) await client.query("DELETE FROM users WHERE id = $1", [user2Id]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
    } finally {
      client.release();
      await redis.quit();
    }
  });

  it("should fetch categories", async () => {
    const res = await request(app)
      .get("/forum/categories")
      .set("Authorization", `Bearer ${user1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    categoryId = res.body.data[0].id; // Save for later
  });

  it("should create an anonymous profile on demand when posting", async () => {
    const res = await request(app)
      .post("/forum/posts")
      .set("Authorization", `Bearer ${user1Token}`)
      .send({
        title: "I am feeling stressed about exams",
        content: "Does anyone else feel this way? I can't sleep.",
        categoryId,
        type: "DISCUSSION",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    postId = res.body.data.id;
  });

  it("should fetch the created post", async () => {
    const res = await request(app)
      .get(`/forum/posts/${postId}`)
      .set("Authorization", `Bearer ${user2Token}`); // User 2 fetching
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("I am feeling stressed about exams");
    expect(res.body.data.author_name).toContain("Anonymous"); // Verify anonymity
  });

  it("should list posts", async () => {
    const res = await request(app)
      .get("/forum/posts")
      .set("Authorization", `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].author_name).toContain("Anonymous");
  });

  it("should allow another user to comment anonymously", async () => {
    const res = await request(app)
      .post(`/forum/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${user2Token}`)
      .send({
        content: "I feel the exact same way. You are not alone.",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    commentId = res.body.data.id;
  });

  it("should list comments for the post", async () => {
    const res = await request(app)
      .get(`/forum/posts/${postId}/comments`)
      .set("Authorization", `Bearer ${user1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].content).toBe("I feel the exact same way. You are not alone.");
    expect(res.body.data[0].author_name).toContain("Anonymous");
  });

  it("should allow a user to like the post", async () => {
    const res = await request(app)
      .post(`/forum/posts/${postId}/like`)
      .set("Authorization", `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.liked).toBe(true);
  });



  it("should reflect counts in post details", async () => {
    const res = await request(app)
      .get(`/forum/posts/${postId}`)
      .set("Authorization", `Bearer ${user1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.counts.likes).toBe(1);
    expect(res.body.data.counts.comments).toBe(1);
    // user 1 shouldn't have viewer_liked = true
    expect(res.body.data.viewer.liked).toBe(false);
  });
});
