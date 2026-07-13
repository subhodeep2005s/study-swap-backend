import { query, getClient } from "@/config/db";
import type { PoolClient } from "pg";

type UpdateField = [column: string, value: unknown];

function buildSetClause(fields: UpdateField[], startIndex = 1) {
  return fields.map(([column], index) => `${column} = $${startIndex + index}`).join(", ");
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function paginationOffset(page: number, limit: number) {
  return (page - 1) * limit;
}

export class AdminRepository {
  // =========================================================================
  // User assertion (shared)
  // =========================================================================
  static async assertUserExists(client: PoolClient, id: string) {
    const result = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [id]);
    if (result.rows.length === 0) return false;
    return true;
  }

  static async upsertProfile(client: PoolClient, userId: string, fields: UpdateField[]) {
    if (fields.length === 0) return;
  
    const columns = fields.map(([column]) => column);
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 2}`);
    const setClause = buildSetClause(fields, 2);
  
    await client.query(
      `INSERT INTO profiles (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClause}, updated_at = NOW()`,
      [userId, ...values]
    );
  }

  static async upsertMentor(client: PoolClient, userId: string, fields: UpdateField[]) {
    if (fields.length === 0) return;
  
    const columns = fields.map(([column]) => column);
    const values = fields.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 2}`);
    const setClause = buildSetClause(fields, 2);
  
    await client.query(
      `INSERT INTO mentors (user_id, ${columns.join(", ")})
       VALUES ($1, ${placeholders.join(", ")})
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClause}, updated_at = NOW()`,
      [userId, ...values]
    );
  }

  // =========================================================================
  // Dashboard Analytics
  // =========================================================================
  static async getDashboardOverview() {
    const result = await query(`
      SELECT
        (SELECT count(*) FROM users) AS "totalUsers",
        (SELECT count(*) FROM users WHERE role = 'student') AS "totalStudents",
        (SELECT count(*) FROM users WHERE role = 'mentor') AS "totalMentors",
        (SELECT count(*) FROM mentors WHERE is_verified = true) AS "verifiedMentors",
        (SELECT count(*) FROM mentors WHERE is_verified = false) AS "unverifiedMentors",
        (SELECT count(*) FROM mentor_bookings) AS "totalBookings",
        (SELECT count(*) FROM mentor_bookings WHERE status = 'confirmed') AS "activeBookings",
        (SELECT count(*) FROM mentor_bookings WHERE status = 'completed') AS "completedBookings",
        (SELECT count(*) FROM mentor_bookings WHERE status = 'cancelled') AS "cancelledBookings",
        (SELECT COALESCE(SUM(amount), 0) FROM mentor_bookings WHERE payment_status = 'paid') AS "totalRevenue",
        (SELECT count(*) FROM user_matches) AS "totalMatches",
        (SELECT count(*) FROM conversations) AS "totalConversations",
        (SELECT count(*) FROM messages) AS "totalMessages"
    `);
    return result.rows[0];
  }

  static async getDashboardUserSignups(days = 30) {
    const result = await query(`
      SELECT 
        DATE(created_at) AS "date",
        count(*) FILTER (WHERE role = 'student') AS "students",
        count(*) FILTER (WHERE role = 'mentor') AS "mentors"
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);
    return result.rows;
  }

  static async getDashboardBookingsByStatus() {
    const result = await query(`
      SELECT status, count(*)::int AS "count"
      FROM mentor_bookings
      GROUP BY status
    `);
    const map: Record<string, number> = {};
    for (const row of result.rows) {
      map[row.status] = row.count;
    }
    return map;
  }

  static async getDashboardRevenueByMonth(months = 6) {
    const result = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS "month",
        COALESCE(SUM(amount), 0)::numeric AS "revenue"
      FROM mentor_bookings
      WHERE payment_status = 'paid'
        AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '${months - 1} months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at) ASC
    `);
    return result.rows;
  }

  static async getDashboardTopMentors(limit = 5) {
    const result = await query(`
      SELECT 
        m.id AS "mentorId",
        p.full_name AS "name",
        p.profile_image AS "profileImage",
        count(b.id)::int AS "totalBookings",
        COALESCE(SUM(b.amount), 0)::numeric AS "revenue"
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      LEFT JOIN mentor_bookings b ON b.mentor_id = m.id AND b.payment_status = 'paid'
      GROUP BY m.id, p.full_name, p.profile_image
      ORDER BY "totalBookings" DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  static async getDashboardTopExams(limit = 5) {
    const result = await query(`
      SELECT 
        e.id AS "examId",
        e.name AS "name",
        c.name AS "countryName",
        count(ue.id)::int AS "studentCount"
      FROM education_nodes e
      LEFT JOIN user_education_nodes ue ON ue.node_id = e.id
      LEFT JOIN countries c ON c.id = e.country_id
      WHERE e.node_type IN ('EXAM', 'LEAF')
      GROUP BY e.id, e.name, c.name
      ORDER BY "studentCount" DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  // =========================================================================
  // Countries (unchanged logic, now with pagination)
  // =========================================================================
  static async getCountries(params?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = params?.search;

    let whereClause = "";
    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause = `WHERE name ILIKE $${queryParams.length}`;
    }

    const countResult = await query(`SELECT count(*)::int AS total FROM countries ${whereClause}`, queryParams);
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(
      `SELECT * FROM countries ${whereClause} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async createCountry(name: string, flag: string | null | undefined, isoCode: string | null | undefined) {
    const result = await query(
      "INSERT INTO countries (name, flag, iso_code) VALUES ($1, $2, $3) RETURNING *",
      [name, flag || null, isoCode || null]
    );
    return result.rows[0];
  }

  static async updateCountry(id: string, fields: UpdateField[]) {
    const result = fields.length > 0
        ? await query(
            `UPDATE countries SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
            [...fields.map(([, value]) => value), id]
          )
        : await query("SELECT * FROM countries WHERE id = $1", [id]);
    return result.rows[0];
  }

  static async deleteCountry(id: string) {
    const result = await query("DELETE FROM countries WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  // =========================================================================
  // Education Nodes (with pagination)
  // =========================================================================
  static async getEducationNodes(params?: PaginationParams & { parentId?: string; type?: string }): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = params?.search;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND e.name ILIKE $${queryParams.length}`;
    }
    
    if (params?.parentId !== undefined) {
      if (params.parentId === null || params.parentId === "") {
         whereClause += ` AND e.parent_id IS NULL`;
      } else {
         queryParams.push(params.parentId);
         whereClause += ` AND e.parent_id = $${queryParams.length}`;
      }
    }
    
    if (params?.type) {
      queryParams.push(params.type);
      whereClause += ` AND e.node_type = $${queryParams.length}`;
    }

    const countResult = await query(`SELECT count(*)::int AS total FROM education_nodes e ${whereClause}`, queryParams);
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(
      `SELECT e.*, c.name as country_name, p.name as parent_name
       FROM education_nodes e 
       LEFT JOIN countries c ON c.id = e.country_id
       LEFT JOIN education_nodes p ON p.id = e.parent_id
       ${whereClause} 
       ORDER BY e.sort_order ASC, e.created_at DESC 
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getEducationNodesByCountry(countryId: string) {
    const result = await query("SELECT * FROM education_nodes WHERE country_id = $1 ORDER BY parent_id NULLS FIRST, sort_order ASC", [countryId]);
    return result.rows;
  }

  static async createEducationNode(countryId: string | null | undefined, parentId: string | null | undefined, name: string, nodeType: string, isActive: boolean, sortOrder: number = 0) {
    const result = await query(
      "INSERT INTO education_nodes (country_id, parent_id, name, node_type, is_active, sort_order) VALUES ($1, $2, $3, $4, COALESCE($5, true), $6) RETURNING *",
      [countryId || null, parentId || null, name, nodeType, isActive, sortOrder]
    );
    return result.rows[0];
  }

  static async updateEducationNode(id: string, fields: UpdateField[]) {
    const result = fields.length > 0
        ? await query(
            `UPDATE education_nodes SET ${buildSetClause(fields)}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
            [...fields.map(([, value]) => value), id]
          )
        : await query("SELECT * FROM education_nodes WHERE id = $1", [id]);
    return result.rows[0];
  }

  static async deleteEducationNode(id: string) {
    const result = await query("DELETE FROM education_nodes WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  // =========================================================================
  // Users (with pagination + search)
  // =========================================================================
  static async getUsers(params?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = params?.search;

    let whereClause = "";
    const queryParams: any[] = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause = `WHERE (p.full_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`;
    }

    const countResult = await query(
      `SELECT count(*)::int AS total FROM users u LEFT JOIN profiles p ON u.id = p.user_id ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
             p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getStudents(params?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = params?.search;

    const queryParams: any[] = [];
    let searchClause = "";

    if (search) {
      queryParams.push(`%${search}%`);
      searchClause = `AND (p.full_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`;
    }

    const countResult = await query(
      `SELECT count(*)::int AS total FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.role = 'student' ${searchClause}`,
      queryParams
    );
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
             p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'student' ${searchClause}
      ORDER BY u.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getMentorsUsers(params?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const search = params?.search;

    const queryParams: any[] = [];
    let searchClause = "";

    if (search) {
      queryParams.push(`%${search}%`);
      searchClause = `AND (p.full_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`;
    }

    const countResult = await query(
      `SELECT count(*)::int AS total FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.role = 'mentor' ${searchClause}`,
      queryParams
    );
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
             p.full_name, p.profile_image, p.country_id, p.state, p.gender, p.age
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.role = 'mentor' ${searchClause}
      ORDER BY u.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  // =========================================================================
  // Enriched User Detail (single user with EVERYTHING)
  // =========================================================================
  static async getUserById(id: string) {
    // Base user + profile
    const userResult = await query(`
      SELECT u.id, u.email, u.role, u.email_verified, u.onboarding_completed, u.created_at, 
             p.full_name, p.profile_image, p.age, p.gender, p.state, p.country_id, p.bio, 
             p.strong_in, p.need_help_with, p.study_time, p.looking_for,
             c.name as country_name
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN countries c ON c.id = p.country_id
      WHERE u.id = $1
    `, [id]);

    if (userResult.rows.length === 0) return null;

    const user: any = userResult.rows[0]!;

    // Education Nodes
    const educationResult = await query(`
      SELECT en.id, en.name, c.name as country_name, en.node_type
      FROM user_education_nodes uen
      JOIN education_nodes en ON en.id = uen.node_id
      LEFT JOIN countries c ON c.id = en.country_id
      WHERE uen.user_id = $1
    `, [id]);
    user.educationNodes = educationResult.rows;

    // Match stats
    const matchResult = await query(`
      SELECT 
        count(*)::int AS "total",
        count(*) FILTER (WHERE status = 'accepted')::int AS "accepted",
        count(*) FILTER (WHERE status = 'pending')::int AS "pending",
        count(*) FILTER (WHERE status = 'rejected')::int AS "rejected",
        count(*) FILTER (WHERE status = 'saved')::int AS "saved"
      FROM user_matches
      WHERE user_id = $1 OR matched_user_id = $1
    `, [id]);
    user.matchStats = matchResult.rows[0];

    // If mentor role, get mentor profile + plans + booking count
    if (user.role === "mentor") {
      const mentorResult = await query(`
        SELECT m.id, m.title, m.qualification, m.experience_years, m.hourly_price, 
               m.rating, m.total_reviews, m.about, m.is_verified, m.phone_number, m.created_at
        FROM mentors m WHERE m.user_id = $1
      `, [id]);
      user.mentor = mentorResult.rows[0] || null;

      if (user.mentor) {
        const plansResult = await query(
          `SELECT id, title, description, duration_minutes, price, is_active FROM mentor_plans WHERE mentor_id = $1 ORDER BY price ASC`,
          [user.mentor.id]
        );
        user.mentor.plans = plansResult.rows;

        const bookingCountResult = await query(
          `SELECT count(*)::int AS total FROM mentor_bookings WHERE mentor_id = $1`,
          [user.mentor.id]
        );
        user.mentor.totalBookings = bookingCountResult.rows[0]!.total;
      }
    }

    // Student bookings (bookings this user made as a student)
    const bookingsResult = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, b.google_meet_url,
        b.google_calendar_url, b.meeting_provider, b.created_at,
        p.title as plan_title, p.duration_minutes,
        s.start_time, s.end_time,
        prof.full_name as mentor_name, prof.profile_image as mentor_image
      FROM mentor_bookings b
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN profiles prof ON prof.user_id = m.user_id
      WHERE b.student_id = $1
      ORDER BY s.start_time DESC
      LIMIT 20
    `, [id]);
    user.bookings = bookingsResult.rows;

    return user;
  }

  // =========================================================================
  // Mentors (admin view)
  // =========================================================================
  static async getAdminMentors() {
    const result = await query(`
      SELECT m.*, p.full_name, p.profile_image, u.email,
        (SELECT count(*)::int FROM mentor_bookings b WHERE b.mentor_id = m.id) AS total_bookings,
        (SELECT count(*)::int FROM mentor_bookings b WHERE b.mentor_id = m.id AND b.status = 'confirmed') AS active_bookings
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN users u ON u.id = m.user_id
      ORDER BY m.created_at DESC
    `);
    return result.rows;
  }

  static async getAdminMentor(id: string) {
    const result = await query(`
      SELECT m.*, p.full_name, p.profile_image, u.email
      FROM mentors m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async updateAdminMentor(id: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(id);
  
    const result = await query(`
      UPDATE mentors SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0];
  }

  static async deleteAdminMentor(id: string) {
    const result = await query("DELETE FROM mentors WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  static async verifyAdminMentor(id: string) {
    const result = await query("UPDATE mentors SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
    return result.rows[0];
  }

  // =========================================================================
  // Bookings (enhanced with mentor info + meet link)
  // =========================================================================
  static async getAdminBookings(params?: PaginationParams & { status?: string }): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const status = params?.status;
    const search = params?.search;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (status) {
      queryParams.push(status);
      conditions.push(`b.status = $${queryParams.length}`);
    }
    if (search) {
      queryParams.push(`%${search}%`);
      conditions.push(`(student_prof.full_name ILIKE $${queryParams.length} OR mentor_prof.full_name ILIKE $${queryParams.length} OR u.email ILIKE $${queryParams.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(`
      SELECT count(*)::int AS total
      FROM mentor_bookings b
      JOIN users u ON u.id = b.student_id
      JOIN profiles student_prof ON student_prof.user_id = u.id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN profiles mentor_prof ON mentor_prof.user_id = m.user_id
      ${whereClause}
    `, queryParams);
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, 
        b.google_meet_url, b.google_calendar_url, b.google_event_id, b.meeting_provider,
        b.created_at, b.updated_at,
        s.start_time, s.end_time,
        p.title AS plan_title, p.duration_minutes, p.price AS plan_price,
        u.email AS student_email,
        student_prof.full_name AS student_name, student_prof.profile_image AS student_image,
        mentor_prof.full_name AS mentor_name, mentor_prof.profile_image AS mentor_image,
        mu.email AS mentor_email,
        m.id AS mentor_id
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles student_prof ON student_prof.user_id = u.id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN users mu ON mu.id = m.user_id
      JOIN profiles mentor_prof ON mentor_prof.user_id = m.user_id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getAdminBooking(id: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, 
        b.google_meet_url, b.google_calendar_url, b.google_event_id, b.meeting_provider,
        b.created_at, b.updated_at,
        s.start_time, s.end_time,
        p.title AS plan_title, p.duration_minutes, p.price AS plan_price,
        u.email AS student_email, u.id AS student_id,
        student_prof.full_name AS student_name, student_prof.profile_image AS student_image,
        mentor_prof.full_name AS mentor_name, mentor_prof.profile_image AS mentor_image,
        mu.email AS mentor_email,
        m.id AS mentor_id
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles student_prof ON student_prof.user_id = u.id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN users mu ON mu.id = m.user_id
      JOIN profiles mentor_prof ON mentor_prof.user_id = m.user_id
      WHERE b.id = $1
    `, [id]);
    return result.rows[0];
  }

  static async getAdminBookingsByMentor(mentorId: string) {
    const result = await query(`
      SELECT 
        b.id, b.status, b.payment_status, b.amount, b.meeting_link, 
        b.google_meet_url, b.google_calendar_url, b.meeting_provider,
        b.created_at,
        s.start_time, s.end_time,
        p.title AS plan_title, p.duration_minutes,
        u.email AS student_email,
        prof.full_name AS student_name, prof.profile_image AS student_image
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN mentor_plans p ON p.id = b.plan_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles prof ON prof.user_id = u.id
      WHERE b.mentor_id = $1
      ORDER BY b.created_at DESC
    `, [mentorId]);
    return result.rows;
  }

  static async updateAdminBooking(id: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(id);
  
    const result = await query(`
      UPDATE mentor_bookings SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0];
  }

  static async deleteAdminBooking(id: string) {
    const result = await query("DELETE FROM mentor_bookings WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  // =========================================================================
  // Mentor Availability (admin)
  // =========================================================================
  static async getMentorAvailability(mentorId: string) {
    const result = await query(
      `SELECT day_of_week, start_time, end_time FROM mentor_availability WHERE mentor_id = $1 ORDER BY day_of_week, start_time`,
      [mentorId]
    );
    return result.rows;
  }

  static async updateMentorAvailabilityTransaction(mentorId: string, availability: { day_of_week: number, start_time: string, end_time: string }[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      await client.query("DELETE FROM mentor_availability WHERE mentor_id = $1", [mentorId]);
      
      for (const rule of availability) {
        if (rule.start_time >= rule.end_time) {
          await client.query("ROLLBACK");
          throw new Error(`Start time must be before end time: ${rule.start_time} - ${rule.end_time}`);
        }
        await client.query(
          "INSERT INTO mentor_availability (mentor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
          [mentorId, rule.day_of_week, rule.start_time, rule.end_time]
        );
      }
      
      await client.query("COMMIT");
      return await this.getMentorAvailability(mentorId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // Mentor Plans (admin)
  // =========================================================================
  static async getMentorPlans(mentorId: string) {
    const result = await query(`
      SELECT id, title, description, duration_minutes, price, is_active, created_at
      FROM mentor_plans
      WHERE mentor_id = $1
      ORDER BY price ASC
    `, [mentorId]);
    return result.rows;
  }

  static async updatePlan(planId: string, fields: string[], values: any[]) {
    fields.push(`updated_at = NOW()`);
    values.push(planId);

    const result = await query(`
      UPDATE mentor_plans SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0];
  }

  static async deletePlan(planId: string) {
    // Only delete if no active bookings reference this plan
    const bookingCheck = await query(
      "SELECT count(*)::int AS c FROM mentor_bookings WHERE plan_id = $1 AND status IN ('pending', 'confirmed')",
      [planId]
    );
    if (bookingCheck.rows[0]!.c > 0) {
      return { error: "Cannot delete plan with active bookings", code: 400 };
    }
    const result = await query("DELETE FROM mentor_plans WHERE id = $1 RETURNING id", [planId]);
    return result.rows.length > 0 ? { success: true } : { error: "Plan not found", code: 404 };
  }

  // =========================================================================
  // Matches (admin)
  // =========================================================================
  static async getMatches(params?: PaginationParams): Promise<PaginatedResult<any>> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;

    const countResult = await query(`SELECT count(*)::int AS total FROM user_matches`);
    const total = countResult.rows[0]!.total;

    const result = await query(`
      SELECT 
        um.id, um.status, um.matched_by, um.created_at,
        p1.full_name AS user_name, p1.profile_image AS user_image, u1.email AS user_email,
        p2.full_name AS matched_user_name, p2.profile_image AS matched_user_image, u2.email AS matched_user_email
      FROM user_matches um
      JOIN users u1 ON u1.id = um.user_id
      JOIN users u2 ON u2.id = um.matched_user_id
      LEFT JOIN profiles p1 ON p1.user_id = um.user_id
      LEFT JOIN profiles p2 ON p2.user_id = um.matched_user_id
      ORDER BY um.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, paginationOffset(page, limit)]);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  static async getMatchesByUser(userId: string) {
    const result = await query(`
      SELECT 
        um.id, um.status, um.matched_by, um.created_at,
        CASE WHEN um.user_id = $1 THEN p2.full_name ELSE p1.full_name END AS partner_name,
        CASE WHEN um.user_id = $1 THEN p2.profile_image ELSE p1.profile_image END AS partner_image,
        CASE WHEN um.user_id = $1 THEN u2.email ELSE u1.email END AS partner_email
      FROM user_matches um
      JOIN users u1 ON u1.id = um.user_id
      JOIN users u2 ON u2.id = um.matched_user_id
      LEFT JOIN profiles p1 ON p1.user_id = um.user_id
      LEFT JOIN profiles p2 ON p2.user_id = um.matched_user_id
      WHERE um.user_id = $1 OR um.matched_user_id = $1
      ORDER BY um.created_at DESC
    `, [userId]);
    return result.rows;
  }

  static async deleteMatch(matchId: string) {
    const result = await query("DELETE FROM user_matches WHERE id = $1 RETURNING id", [matchId]);
    return result.rows.length > 0;
  }

  // =========================================================================
  // Audit Logs
  // =========================================================================
  static async getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
  }): Promise<PaginatedResult<any>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (params.userId) {
      queryParams.push(params.userId);
      conditions.push(`a.user_id = $${queryParams.length}`);
    }
    if (params.action) {
      queryParams.push(params.action);
      conditions.push(`a.action = $${queryParams.length}`);
    }
    if (params.from) {
      queryParams.push(params.from);
      conditions.push(`a.created_at >= $${queryParams.length}`);
    }
    if (params.to) {
      queryParams.push(params.to);
      conditions.push(`a.created_at <= $${queryParams.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(`SELECT count(*)::int AS total FROM audit_logs a ${whereClause}`, queryParams);
    const total = countResult.rows[0]!.total;

    queryParams.push(limit, paginationOffset(page, limit));
    const result = await query(`
      SELECT 
        a.id, a.user_id, a.user_role, a.action, a.entity, a.details, 
        a.ip_address, a.user_agent, a.status_code, a.created_at,
        p.full_name AS user_name
      FROM audit_logs a
      LEFT JOIN profiles p ON p.user_id = a.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  // =========================================================================
  // User update & delete (transaction-based)
  // =========================================================================
  static async updateUserTransaction(id: string, userFields: string[], userValues: unknown[], profileFields: UpdateField[], mentorFields?: UpdateField[]) {
    const client = await getClient();
    try {
      await client.query("BEGIN");
      
      const exists = await this.assertUserExists(client, id);
      if (!exists) {
        await client.query("ROLLBACK");
        return { error: "User not found", code: 404 };
      }
      
      if (userFields.length > 0) {
        userFields.push(`updated_at = NOW()`);
        userValues.push(id);
        await client.query(`UPDATE users SET ${userFields.join(", ")} WHERE id = $${userFields.length}`, userValues);
      }
      
      await this.upsertProfile(client, id, profileFields);
      
      if (mentorFields) {
        await this.upsertMentor(client, id, mentorFields);
      }
      
      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(id: string) {
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
  }

  // =========================================================================
  // Regenerate Meet Link (get booking info for service layer)
  // =========================================================================
  static async getBookingForMeetRegeneration(bookingId: string) {
    const result = await query(`
      SELECT 
        b.id, b.student_id, b.mentor_id, b.google_meet_url, b.google_event_id,
        s.start_time, s.end_time,
        u.email AS student_email,
        sp.full_name AS student_name,
        mu.email AS mentor_email,
        mp.full_name AS mentor_name
      FROM mentor_bookings b
      JOIN mentor_slots s ON s.id = b.slot_id
      JOIN users u ON u.id = b.student_id
      JOIN profiles sp ON sp.user_id = b.student_id
      JOIN mentors m ON m.id = b.mentor_id
      JOIN users mu ON mu.id = m.user_id
      JOIN profiles mp ON mp.user_id = m.user_id
      WHERE b.id = $1 AND b.status IN ('pending', 'confirmed')
    `, [bookingId]);
    return result.rows[0];
  }
}
