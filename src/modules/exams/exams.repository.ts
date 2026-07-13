import { query } from "@/config/db";

export class ExamsRepository {
  static async getEducationNodesByCountry(countryId: string) {
    const result = await query(
      "SELECT id, parent_id, name, node_type, sort_order FROM education_nodes WHERE country_id = $1 AND is_active = true ORDER BY parent_id NULLS FIRST, sort_order ASC, name ASC",
      [countryId]
    );
    return result.rows;
  }
}
