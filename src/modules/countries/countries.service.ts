import { query } from "@/config/db";
import { AppError } from "@/core/errors/AppError";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { redis } from "@/config/redis";

export async function getCountries() {
  const cacheKey = "cache:countries";
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await query("SELECT id, name, flag, iso_code FROM countries ORDER BY name ASC");
  
  await redis.set(cacheKey, JSON.stringify(result.rows), "EX", 86400); // 24 hours
  return result.rows;
}

export async function getStatesByCountry(countryCode: string) {
  const cacheKey = `cache:states:${countryCode}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  if (!env.COUNTRY_STATE_CITY_API_KEY) {
    logger.warn("COUNTRY_STATE_CITY_API_KEY is not configured.");
    throw new AppError("States API is currently unavailable", 503);
  }

  try {
    const response = await fetch(`https://api.countrystatecity.in/v1/countries/${countryCode}/states`, {
      headers: { 'X-CSCAPI-KEY': env.COUNTRY_STATE_CITY_API_KEY }
    });

    if (response.ok) {
      const states = await response.json();
      await redis.set(cacheKey, JSON.stringify(states), "EX", 604800); // 7 days
      return states;
    } else {
      logger.error(`States API returned ${response.status} for country ${countryCode}`);
      throw new AppError("Failed to fetch states", response.status);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error({ error, countryCode }, "Error fetching states from external API");
    throw new AppError("Failed to fetch states from external provider", 500);
  }
}
