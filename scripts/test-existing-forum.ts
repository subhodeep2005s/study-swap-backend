import { getClient } from "../src/config/db";
import { generateToken } from "../src/core/utils/jwt";

const API_BASE = "http://localhost:8000";

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

async function main() {
  const client = await getClient();
  try {
    // 1. Get two existing students
    console.log("Fetching 2 existing students from DB...");
    const userRes = await client.query("SELECT id, email, role FROM users WHERE role = 'student' LIMIT 2");
    if (userRes.rows.length < 2) {
      console.log("Need at least 2 students in DB to run this test.");
      return;
    }
    
    const user1 = userRes.rows[0];
    const user2 = userRes.rows[1];
    
    console.log(`Using Student 1: ${user1.email}`);
    console.log(`Using Student 2: ${user2.email}`);
    
    // 2. Generate Tokens
    const token1 = generateToken({ id: user1.id, email: user1.email, role: user1.role });
    const token2 = generateToken({ id: user2.id, email: user2.email, role: user2.role });

    // 3. Fetch Categories
    console.log("\n--- GET /forum/categories ---");
    const catRes = await fetchApi("/forum/categories", "GET", token1);
    console.log("Categories fetched:", catRes.data.length);
    const categoryId = catRes.data[0].id;

    // 3.5. Test Presigned URL Generation for Media (Video and Image)
    console.log("\n--- POST /uploads/presigned-url ---");
    const videoUploadRes = await fetchApi("/uploads/presigned-url", "POST", token1, {
      fileName: "study-session.mp4",
      contentType: "video/mp4",
      uploadType: "forum-media"
    });
    console.log("Video Presigned URL Key:", videoUploadRes.data.key);

    const imageUploadRes = await fetchApi("/uploads/presigned-url", "POST", token1, {
      fileName: "notes.jpg",
      contentType: "image/jpeg",
      uploadType: "forum-media"
    });
    console.log("Image Presigned URL Key:", imageUploadRes.data.key);

    // 4. Create Post with Media and Poll
    console.log("\n--- POST /forum/posts (with media and poll) ---");
    const postPayload = {
      title: "How do you guys study for NEET Physics?",
      content: "I am struggling with Mechanics. Also check out my study setup video!",
      categoryId,
      type: "QUESTION",
      media: [
        {
          objectKey: videoUploadRes.data.key,
          url: videoUploadRes.data.publicUrl,
          mimeType: "video/mp4",
          size: 15000000,
          type: "VIDEO"
        },
        {
          objectKey: imageUploadRes.data.key,
          url: imageUploadRes.data.publicUrl,
          mimeType: "image/jpeg",
          size: 200000,
          type: "IMAGE"
        }
      ],
      poll: {
        expiresInHours: 24,
        options: ["HC Verma", "DC Pandey", "NCERT Only", "Coaching Material"]
      }
    };
    const postRes = await fetchApi("/forum/posts", "POST", token1, postPayload);
    console.log("Post Created ID:", postRes.data.id);
    const postId = postRes.data.id;

    // 5. User 2 fetches Feed
    console.log("\n--- GET /forum/posts (Feed) ---");
    const feedRes = await fetchApi("/forum/posts", "GET", token2);
    console.log(`Feed contains ${feedRes.data.length} posts.`);
    const newlyCreatedPost = feedRes.data.find((p: any) => p.id === postId);
    console.log(`Newly created post is visible. Author Name: ${newlyCreatedPost.author_name}`);

    // 6. User 2 Comments
    console.log(`\n--- POST /forum/posts/${postId}/comments ---`);
    const commentRes = await fetchApi(`/forum/posts/${postId}/comments`, "POST", token2, {
      content: "I highly recommend HC Verma and past year papers!"
    });
    console.log("Comment Created ID:", commentRes.data.id);

    // 7. User 2 Likes the Post
    console.log(`\n--- POST /forum/posts/${postId}/like ---`);
    const likeRes = await fetchApi(`/forum/posts/${postId}/like`, "POST", token2);
    console.log("Like Response:", likeRes.data);

    // 7.5. User 2 Votes on Poll
    console.log(`\n--- POST /polls/.../vote ---`);
    // Need to fetch details first to get the poll options
    const tempDetail = await fetchApi(`/forum/posts/${postId}`, "GET", token2);
    if (tempDetail.data.poll && tempDetail.data.poll.options.length > 0) {
      const optionId = tempDetail.data.poll.options[0].id;
      const voteRes = await fetchApi(`/forum/polls/${tempDetail.data.poll.id}/vote`, "POST", token2, { optionId });
      console.log("Voted on Poll Option ID:", optionId);
    }

    // 8. User 1 checks post details to see updated counts, media, and polls
    console.log(`\n--- GET /forum/posts/${postId} ---`);
    const detailRes = await fetchApi(`/forum/posts/${postId}`, "GET", token1);
    console.log(`Post Details: Likes (${detailRes.data.counts.likes}), Comments (${detailRes.data.counts.comments})`);
    console.log(`Media Attached: ${detailRes.data.media?.length || 0} files`);
    if (detailRes.data.media?.length > 0) {
      console.log(`- Media 1: ${detailRes.data.media[0].type} (${detailRes.data.media[0].url})`);
      console.log(`- Media 2: ${detailRes.data.media[1].type} (${detailRes.data.media[1].url})`);
    }
    console.log(`Poll Options: ${detailRes.data.poll?.options?.length || 0}`);
    if (detailRes.data.poll) {
      const votedOption = detailRes.data.poll.options.find((o: any) => o.vote_count > 0);
      console.log(`- Option '${votedOption?.text}' has ${votedOption?.vote_count} votes.`);
    }

    console.log("\n✅ All real DB integrations tested successfully!");

  } catch (error) {
    console.error("Test Failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
