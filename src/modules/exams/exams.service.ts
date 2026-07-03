import { query } from "@/config/db";
import { redis } from "@/config/redis";

export async function getExamsByCountry(countryId: string) {
  const cacheKey = `cache:exams:${countryId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query(
    "SELECT id, name FROM exams WHERE country_id = $1 AND is_active = true ORDER BY name ASC",
    [countryId]
  );
  
  await redis.set(cacheKey, JSON.stringify(result.rows), "EX", 86400); // 24 hours
  return result.rows;
}
