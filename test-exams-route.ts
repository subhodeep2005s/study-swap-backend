import jwt from 'jsonwebtoken';
import { query } from './src/config/db';

async function testRoute() {
  try {
    // 1. Get a user
    const userRes = await query("SELECT id, email FROM users LIMIT 1");
    if (userRes.rows.length === 0) {
      console.log("No users found to test.");
      process.exit(1);
    }
    const user = userRes.rows[0];

    // 2. Get India's country ID
    const countryRes = await query("SELECT id FROM countries WHERE name = 'India' LIMIT 1");
    if (countryRes.rows.length === 0) {
      console.log("India not found in countries.");
      process.exit(1);
    }
    const countryId = countryRes.rows[0].id;

    // 3. Ensure user has profile and country set
    await query(`
      INSERT INTO profiles (user_id, country_id) 
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET country_id = $2
    `, [user.id, countryId]);

    // 4. Generate token
    const token = jwt.sign(
      { userId: user.id, role: 'STUDENT' }, 
      process.env.JWT_SECRET || '4d6f94a70979cf623bbd0861994e29d2a4479bfc4fb5183ce30a95128c8157caea943aa10ce167b3ad157646e9111e80b6f1f2260a02bdfb9d0ffd9107284c72', 
      { expiresIn: '1h' }
    );

    // 5. Fetch education nodes via HTTP route
    const response = await fetch('http://localhost:8000/onboarding/education-nodes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log("Route response status:", response.status);
    console.log("Returned data length:", data.data?.length);
    if (data.data?.length > 0) {
      console.log("First 3 items returned by the route:");
      console.log(JSON.stringify(data.data.slice(0, 3), null, 2));
      
      // Let's see if exams are inside
      // It's a hierarchy, so let's log the structure briefly
      const firstNode = data.data[0];
      if (firstNode.children && firstNode.children.length > 0) {
         console.log("Children of first node:", firstNode.children[0].name);
      }
    } else {
      console.log("No data returned by the route.");
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
testRoute();
