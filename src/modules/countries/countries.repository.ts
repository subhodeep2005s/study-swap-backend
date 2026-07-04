import { query } from "@/config/db";

export class CountriesRepository {
  static async getCountries() {
    const result = await query("SELECT id, name, flag, iso_code FROM countries ORDER BY name ASC");
    return result.rows;
  }
}
