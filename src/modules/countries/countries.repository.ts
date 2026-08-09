import { query } from "@/config/db";

export class CountriesRepository {
  static async getCountries() {
    const result = await query("SELECT id, name, flag, iso_code FROM countries ORDER BY name ASC");
    return result.rows;
  }

  static async getExamsByCountry(countryId: string) {
    const result = await query(
      "SELECT id, name FROM education_nodes WHERE country_id = $1 AND node_type = 'EXAM' AND is_active = true ORDER BY sort_order ASC",
      [countryId]
    );
    return result.rows;
  }
}
