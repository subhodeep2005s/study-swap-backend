import { query, closePool } from "../src/config/db";

async function wipeDatabase() {
  console.log("Wiping database completely...");
  
  try {
    await query(`
      TRUNCATE TABLE 
        users, 
        countries,
        education_nodes
      CASCADE;
    `);

    console.log("Database wiped successfully!");
  } catch (error) {
    console.error("Error wiping database:", error);
  } finally {
    await closePool();
  }
}

wipeDatabase();
