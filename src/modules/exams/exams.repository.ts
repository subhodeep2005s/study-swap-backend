import { query } from "@/config/db";

export class ExamsRepository {
  static async getExamsByCountry(countryId: string) {
    const result = await query(
      "SELECT id, name FROM exams WHERE country_id = $1 AND is_active = true ORDER BY name ASC",
      [countryId]
    );
    return result.rows;
  }
}
