import { redis } from "@/config/redis";
import { ExamsRepository } from "./exams.repository";

export async function getExamsByCountry(countryId: string) {
  const cacheKey = `cache:exams:${countryId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await ExamsRepository.getExamsByCountry(countryId);
  
  await redis.set(cacheKey, JSON.stringify(result), "EX", 86400); // 24 hours
  return result;
}
