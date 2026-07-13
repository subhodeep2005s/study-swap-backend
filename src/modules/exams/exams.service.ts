import { redis } from "@/config/redis";
import { ExamsRepository } from "./exams.repository";

export async function getEducationNodesByCountry(countryId: string) {
  const cacheKey = `cache:education-nodes:${countryId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await ExamsRepository.getEducationNodesByCountry(countryId);
  
  await redis.set(cacheKey, JSON.stringify(result), "EX", 86400); // 24 hours
  return result;
}
