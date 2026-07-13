import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query, getClient } from "../src/config/db";
import { AdminRepository } from "../src/modules/admin/admin.repository";
import { MatchesRepository } from "../src/modules/matches/matches.repository";
import { randomUUID } from "crypto";

describe("Brutal Education System Tests", () => {
  let countryId: string;
  let rootNodeId: string;
  let childNodeId: string;
  let leafNodeId: string;
  let user1Id = randomUUID();
  let user2Id = randomUUID();

  beforeAll(async () => {
    // Insert a fake country for testing
    const countryRes = await query(`
      INSERT INTO countries (id, name, flag) 
      VALUES (gen_random_uuid(), 'Test Country', 'TC') 
      RETURNING id
    `);
    countryId = countryRes.rows[0].id;

    // Create fake users
    await query(`INSERT INTO users (id, email, role) VALUES ($1, 'test1@test.com', 'student')`, [user1Id]);
    await query(`INSERT INTO profiles (user_id, full_name, state) VALUES ($1, 'User 1', 'Test State')`, [user1Id]);

    await query(`INSERT INTO users (id, email, role) VALUES ($1, 'test2@test.com', 'student')`, [user2Id]);
    await query(`INSERT INTO profiles (user_id, full_name, state) VALUES ($1, 'User 2', 'Test State')`, [user2Id]);
  });

  afterAll(async () => {
    await query(`DELETE FROM countries WHERE id = $1`, [countryId]);
    await query(`DELETE FROM users WHERE id IN ($1, $2)`, [user1Id, user2Id]);
  });

  it("should create a root node", async () => {
    const node = await AdminRepository.createEducationNode(
      countryId,
      null,
      "Root Exam Board",
      "BOARD",
      true,
      0
    );
    expect(node).toBeDefined();
    expect(node.id).toBeDefined();
    rootNodeId = node.id;
  });

  it("should create a child node under the root", async () => {
    const node = await AdminRepository.createEducationNode(
      countryId,
      rootNodeId,
      "Class 10",
      "CLASS",
      true,
      0
    );
    expect(node).toBeDefined();
    expect(node.parent_id).toBe(rootNodeId);
    childNodeId = node.id;
  });

  it("should create a leaf node (subject) under the class", async () => {
    const node = await AdminRepository.createEducationNode(
      countryId,
      childNodeId,
      "Mathematics",
      "SUBJECT",
      true,
      0
    );
    expect(node).toBeDefined();
    expect(node.parent_id).toBe(childNodeId);
    leafNodeId = node.id;
  });

  it("should correctly link users to education nodes", async () => {
    // User 1 selects Mathematics
    await query(`INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)`, [user1Id, leafNodeId]);
    // User 2 selects Mathematics
    await query(`INSERT INTO user_education_nodes (user_id, node_id) VALUES ($1, $2)`, [user2Id, leafNodeId]);

    const res = await query(`SELECT * FROM user_education_nodes WHERE node_id = $1`, [leafNodeId]);
    expect(res.rows.length).toBe(2);
  });

  it("should generate matches based on shared education nodes", async () => {
    // Set onboarding true
    await query(`UPDATE users SET onboarding_completed = true WHERE id IN ($1, $2)`, [user1Id, user2Id]);

    const client = await getClient();
    try {
      const matchRes = await MatchesRepository.generateMatches(client, user1Id, 10);
      expect(matchRes.rows.length).toBe(1);
      expect(matchRes.rows[0].matched_user_id).toBe(user2Id);
    } finally {
      client.release();
    }
  });

  it("should cascade delete children when parent is deleted", async () => {
    // Deleting root node should delete child and leaf node
    await AdminRepository.deleteEducationNode(rootNodeId);

    const childRes = await query(`SELECT * FROM education_nodes WHERE id = $1`, [childNodeId]);
    expect(childRes.rows.length).toBe(0);

    const leafRes = await query(`SELECT * FROM education_nodes WHERE id = $1`, [leafNodeId]);
    expect(leafRes.rows.length).toBe(0);
  });

  it("should cascade delete user references when node is deleted", async () => {
    const userNodeRes = await query(`SELECT * FROM user_education_nodes WHERE node_id = $1`, [leafNodeId]);
    expect(userNodeRes.rows.length).toBe(0);
  });
});
