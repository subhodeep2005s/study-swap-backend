import { getClient } from "./src/config/db";
async function main() {
  const client = await getClient();
  const userId = process.argv[2];
  
  const m = await client.query("SELECT * FROM mentors WHERE user_id = $1", [userId]);
  console.log("Mentors:", m.rows);
  
  if (m.rows[0]) {
    const mentorId = m.rows[0].id;
    const p = await client.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    console.log("Profiles:", p.rows);
    
    const mp = await client.query("SELECT * FROM mentor_plans WHERE mentor_id = $1 AND is_active = true", [mentorId]);
    console.log("Mentor Plans:", mp.rows);
    
    const ma = await client.query("SELECT * FROM mentor_availability WHERE mentor_id = $1", [mentorId]);
    console.log("Mentor Availability:", ma.rows);
  }
  
  client.release();
  process.exit(0);
}
main();
