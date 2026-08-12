import { getClient } from "./src/config/db";
import { getS3ObjectUrl } from "./src/config/s3";

async function run() {
  const client = await getClient();
  const res = await client.query("SELECT id, title, thumbnail_key FROM notes WHERE deleted_at IS NULL");
  
  for (const row of res.rows) {
    if (row.thumbnail_key) {
      console.log(`Note ID: ${row.id} - Thumbnail: ${getS3ObjectUrl(row.thumbnail_key)}`);
    } else {
      console.log(`Note ID: ${row.id} - Thumbnail: NULL`);
    }
  }
  process.exit(0);
}

run();
