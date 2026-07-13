import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getClient, query } from "../src/config/db";
import { MatchesRepository } from "../src/modules/matches/matches.repository";
import type { PoolClient } from "pg";

let client: PoolClient;

beforeAll(async () => {
  client = await getClient();
  await client.query("BEGIN");

  // Clean slate for testing
  await client.query("DELETE FROM mentor_bookings");
  await client.query("DELETE FROM user_matches");
  await client.query("DELETE FROM user_education_nodes");
  await client.query("DELETE FROM education_nodes");
  await client.query("DELETE FROM profiles");
  await client.query("DELETE FROM users");
  await client.query("DELETE FROM countries");

  // 1. Setup minimal seed
  const countryId = (await client.query("INSERT INTO countries (id, name, flag) VALUES (gen_random_uuid(), 'India', 'IN') RETURNING id")).rows[0].id;

  // School Nodes
  const schoolRoot = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, null, 'School Education', 'CATEGORY', 0) RETURNING id", [countryId])).rows[0].id;
  const cbse = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'CBSE', 'BOARD', 0) RETURNING id", [countryId, schoolRoot])).rows[0].id;
  
  const class9 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Class 9', 'CLASS', 9) RETURNING id", [countryId, cbse])).rows[0].id;
  const class10 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Class 10', 'CLASS', 10) RETURNING id", [countryId, cbse])).rows[0].id;
  const class12 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Class 12', 'CLASS', 12) RETURNING id", [countryId, cbse])).rows[0].id;

  const math9 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Mathematics', 'SUBJECT', 0) RETURNING id", [countryId, class9])).rows[0].id;
  const math10 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Mathematics', 'SUBJECT', 0) RETURNING id", [countryId, class10])).rows[0].id;
  const math12 = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Mathematics', 'SUBJECT', 0) RETURNING id", [countryId, class12])).rows[0].id;

  // Competitive Nodes
  const compRoot = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, null, 'Competitive Exams', 'CATEGORY', 0) RETURNING id", [countryId])).rows[0].id;
  const medical = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Medical', 'CATEGORY', 0) RETURNING id", [countryId, compRoot])).rows[0].id;
  const engineering = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'Engineering', 'CATEGORY', 1) RETURNING id", [countryId, compRoot])).rows[0].id;

  const neet = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'NEET', 'EXAM', 0) RETURNING id", [countryId, medical])).rows[0].id;
  const aiims = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'AIIMS', 'EXAM', 1) RETURNING id", [countryId, medical])).rows[0].id;
  const jee = (await client.query("INSERT INTO education_nodes (country_id, parent_id, name, node_type, sort_order) VALUES ($1, $2, 'JEE', 'EXAM', 0) RETURNING id", [countryId, engineering])).rows[0].id;

  // 2. Setup Helper Function to Create Users
  const createUser = async (email: string, state: string, nodeIds: string[]) => {
    const userId = (await client.query("INSERT INTO users (id, email, role, onboarding_completed) VALUES (gen_random_uuid(), $1, 'student', true) RETURNING id", [email])).rows[0].id;
    await client.query("INSERT INTO profiles (user_id, full_name, state) VALUES ($1, $2, $3)", [userId, email.split('@')[0], state]);
    for (const nodeId of nodeIds) {
      await client.query("INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)", [userId, nodeId]);
    }
    return userId;
  };

  (globalThis as any).__SEED__ = {
    math9, math10, math12, neet, aiims, jee, createUser
  };
});

afterAll(async () => {
  await client.query("ROLLBACK");
  client.release();
});

describe("V3 Matching Algorithm", () => {
  it("should match Same Class (Priority 1/2)", async () => {
    const { createUser, math10 } = (globalThis as any).__SEED__;
    const u1 = await createUser("u1@test.com", "Delhi", [math10]);
    const u2 = await createUser("u2@test.com", "Delhi", [math10]);
    const u3 = await createUser("u3@test.com", "Mumbai", [math10]);

    const matches = await MatchesRepository.generateMatches(client, u1, 10);
    expect(matches.rows).toHaveLength(2);
    
    // Priority 1 (Same State) should appear before Priority 2 (Diff State)
    expect(matches.rows[0].matched_user_id).toBe(u2);
    expect(matches.rows[0].source_priority).toBe(1);
    
    expect(matches.rows[1].matched_user_id).toBe(u3);
    expect(matches.rows[1].source_priority).toBe(2);
  });

  it("should match Class -1 fallback (Priority 3/5) but NOT Class -2", async () => {
    const { createUser, math10, math9, math12 } = (globalThis as any).__SEED__;
    const u4 = await createUser("u4@test.com", "Delhi", [math10]);
    const u5 = await createUser("u5@test.com", "Delhi", [math9]); // Class 9 -> Class -1
    const u6 = await createUser("u6@test.com", "Delhi", [math12]); // Class 12 -> Class +2 (Should NOT match)

    const matches = await MatchesRepository.generateMatches(client, u4, 10);
    const matchedIds = matches.rows.map(m => m.matched_user_id);
    
    expect(matchedIds).toContain(u5); // u5 is a valid fallback
    expect(matchedIds).not.toContain(u6); // u6 is too far in hierarchy
    
    const u5Match = matches.rows.find(m => m.matched_user_id === u5);
    expect(u5Match.source_priority).toBe(3); // Class -1, Same state
  });

  it("should strictly silo competitive boundaries (NEET != JEE)", async () => {
    const { createUser, neet, aiims, jee } = (globalThis as any).__SEED__;
    const uNeet1 = await createUser("neet1@test.com", "Delhi", [neet]);
    const uNeet2 = await createUser("neet2@test.com", "Delhi", [neet]);
    const uAiims = await createUser("aiims@test.com", "Delhi", [aiims]);
    const uJee = await createUser("jee@test.com", "Delhi", [jee]);

    const matches = await MatchesRepository.generateMatches(client, uNeet1, 10);
    const matchedIds = matches.rows.map(m => m.matched_user_id);

    expect(matchedIds).toContain(uNeet2); // Same exam (Priority 1)
    expect(matchedIds).toContain(uAiims); // Same category fallback (Priority 3)
    expect(matchedIds).not.toContain(uJee); // Cross-category (MUST NOT MATCH)
  });

  it("should never return blocked, rejected, or accepted matches", async () => {
    const { createUser, neet } = (globalThis as any).__SEED__;
    const current = await createUser("c1@test.com", "Delhi", [neet]);
    const rejectedUser = await createUser("c2@test.com", "Delhi", [neet]);

    // Insert a rejection
    await client.query("INSERT INTO user_matches (user_id, matched_user_id, matched_by, status) VALUES ($1, $2, 'exam', 'rejected')", [current, rejectedUser]);

    const matches = await MatchesRepository.generateMatches(client, current, 10);
    const matchedIds = matches.rows.map(m => m.matched_user_id);

    expect(matchedIds).not.toContain(rejectedUser); // Ensure it respects the exclusion rule
  });

  it("should respect the exact 10 MATCH_LIMIT and avoid executing further queries", async () => {
    const { createUser, math10 } = (globalThis as any).__SEED__;
    const limitUser = await createUser("limit@test.com", "Delhi", [math10]);
    
    // Create 15 users in same class
    for (let i = 0; i < 15; i++) {
      await createUser(`fill${i}@test.com`, "Delhi", [math10]);
    }

    const matches = await MatchesRepository.generateMatches(client, limitUser, 10);
    expect(matches.rows).toHaveLength(10); // Stops exactly at 10
  });
});
