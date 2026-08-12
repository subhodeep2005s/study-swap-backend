import fs from "fs";
import path from "path";
import { getClient } from "../src/config/db";
import { generateToken } from "../src/core/utils/jwt";

const API_BASE = "http://localhost:8000";
const MEDIA_DIR = path.resolve(process.cwd(), "test_media");

async function fetchApi(path: string, method: string, token: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error [${method} ${path}] ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadFileToS3(filename: string, token: string) {
  const filePath = path.join(MEDIA_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  const isVideo = ext === ".mp4";
  const contentType = isVideo ? "video/mp4" : "image/jpeg";
  const stat = fs.statSync(filePath);

  console.log(`Getting presigned URL for ${filename}...`);
  const uploadRes = await fetchApi("/uploads/presigned-url", "POST", token, {
    fileName: filename,
    contentType,
    uploadType: "forum-media"
  });

  const { uploadUrl, key, publicUrl } = uploadRes.data;

  console.log(`Uploading ${filename} to S3...`);
  const fileBuffer = fs.readFileSync(filePath);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: fileBuffer,
    headers: { "Content-Type": contentType }
  });

  if (!putRes.ok) {
    throw new Error(`Failed to upload ${filename} to S3: ${putRes.statusText}`);
  }

  return {
    objectKey: key,
    url: publicUrl,
    mimeType: contentType,
    size: stat.size,
    type: isVideo ? "VIDEO" : "IMAGE"
  };
}

async function main() {
  const client = await getClient();
  try {
    console.log("Fetching up to 20 existing students from DB...");
    const userRes = await client.query("SELECT id, email, role FROM users WHERE role = 'student' LIMIT 20");
    if (userRes.rows.length === 0) {
      console.log("No students found in DB.");
      return;
    }
    
    const users = userRes.rows.map(u => ({
      ...u,
      token: generateToken({ id: u.id, email: u.email, role: u.role })
    }));
    
    console.log(`Found ${users.length} students. Generated tokens.`);

    // 1. Upload Media Once
    console.log("\n--- Uploading test_media files to S3 ---");
    const adminToken = users[0].token;
    const files = fs.readdirSync(MEDIA_DIR).filter(f => !f.startsWith("."));
    
    const uploadedMedia: any[] = [];
    for (const file of files) {
      const media = await uploadFileToS3(file, adminToken);
      uploadedMedia.push(media);
    }
    
    const images = uploadedMedia.filter(m => m.type === "IMAGE");
    const videos = uploadedMedia.filter(m => m.type === "VIDEO");

    // 2. Fetch Categories
    const catRes = await fetchApi("/forum/categories", "GET", adminToken);
    const categoryIds = catRes.data.map((c: any) => c.id);

    // 3. Seed 100 Posts
    console.log("\n--- Seeding 100 Posts ---");
    const createdPostIds: string[] = [];
    
    const postTitles = [
      "I feel like I'm falling behind in preparation",
      "Best resources for organic chemistry?",
      "How to manage time during the actual exam",
      "Anyone else taking a drop year?",
      "Mock test scores are dropping, feeling anxious",
      "Tips for revising physics formulas",
      "Motivation needed today",
      "Study schedule critique?",
      "Is coaching strictly necessary?",
      "Sharing my hand-written notes!"
    ];

    for (let i = 1; i <= 100; i++) {
      // Pick a user evenly to avoid 5-per-10m rate limits (100 posts / 20 users = exactly 5 posts per user)
      const userIndex = (i - 1) % users.length;
      const user = users[userIndex];
      const categoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
      const title = postTitles[Math.floor(Math.random() * postTitles.length)] + ` #${i}`;
      
      const mediaChoice = Math.random();
      let selectedMedia: any[] = [];
      
      if (images.length > 0 && videos.length > 0) {
        if (mediaChoice < 0.33) {
          // Only Image
          selectedMedia.push(images[Math.floor(Math.random() * images.length)]);
        } else if (mediaChoice < 0.66) {
          // Only Video
          selectedMedia.push(videos[Math.floor(Math.random() * videos.length)]);
        } else {
          // Image + Video
          selectedMedia.push(images[Math.floor(Math.random() * images.length)]);
          selectedMedia.push(videos[Math.floor(Math.random() * videos.length)]);
        }
      } else if (images.length > 0) {
        selectedMedia.push(images[Math.floor(Math.random() * images.length)]);
      } else if (videos.length > 0) {
        selectedMedia.push(videos[Math.floor(Math.random() * videos.length)]);
      }

      const hasPoll = Math.random() < 0.2;
      const poll = hasPoll ? {
        expiresInHours: 24,
        options: ["Yes", "No", "Maybe", "Not sure"]
      } : undefined;

      const postPayload = {
        title,
        content: `This is test post number ${i}. Let's discuss this topic openly and share advice.`,
        categoryId,
        type: hasPoll ? "POLL" : "DISCUSSION",
        media: selectedMedia.length > 0 ? selectedMedia : undefined,
        poll
      };

      try {
        const postRes = await fetchApi("/forum/posts", "POST", user.token, postPayload);
        createdPostIds.push(postRes.data.id);
        if (i % 10 === 0) console.log(`Created ${i}/100 posts...`);
      } catch (e: any) {
        console.error(`Error on post ${i}:`, e.message);
      }
    }

    // 4. Seed Random Likes and Comments
    console.log("\n--- Seeding Likes & Comments ---");
    for (let i = 0; i < 150; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const postId = createdPostIds[Math.floor(Math.random() * createdPostIds.length)];
      
      if (Math.random() > 0.5) {
        // Like
        try {
          await fetchApi(`/forum/posts/${postId}/like`, "POST", user.token);
        } catch(e) {}
      } else {
        // Comment
        try {
          await fetchApi(`/forum/posts/${postId}/comments`, "POST", user.token, {
            content: "This is a seeded comment to spark conversation!"
          });
        } catch(e) {}
      }
      if (i % 50 === 0) console.log(`Added ${i}/150 interactions...`);
    }

    console.log("\n✅ Successfully seeded 100 posts with real media combinations and interactions!");

  } catch (error) {
    console.error("Seeder Failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
