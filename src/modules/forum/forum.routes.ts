import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rateLimitMiddleware } from "@/core/middleware/rate-limit.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as forumController from "./forum.controller";
import * as schemas from "./forum.schema";
import "./forum.openapi";

const router = Router();

// All forum routes require authentication
router.use(authMiddleware);

// Profile
router.get("/profile", forumController.fetchProfile);
router.post(
  "/profile",
  rateLimitMiddleware(10, 3600, "forum:profile"), // limit profile generations
  validate(schemas.generateProfileSchema),
  forumController.getProfile
);

router.patch(
  "/profile",
  rateLimitMiddleware(10, 3600, "forum:profile-update"),
  validate(schemas.updateProfileSchema),
  forumController.updateProfile
);

// Categories
router.get("/categories", forumController.getCategories);

// Posts
const postRateLimiter = rateLimitMiddleware(5, 600, "forum:posts"); // 5 per 10 mins

router.post(
  "/posts",
  postRateLimiter,
  validate(schemas.createPostSchema),
  forumController.createPost
);

router.get("/posts", forumController.listPosts);
router.get("/posts/saved", forumController.listSavedPosts);
router.get("/posts/:id", forumController.getPost);

// Comments
const commentRateLimiter = rateLimitMiddleware(20, 600, "forum:comments"); // 20 per 10 mins

router.post(
  "/posts/:id/comments",
  commentRateLimiter,
  validate(schemas.createCommentSchema),
  forumController.createComment
);

router.get("/posts/:id/comments", forumController.listComments);

// Reactions (Likes, Me Too, Saves)
const reactionRateLimiter = rateLimitMiddleware(60, 60, "forum:reactions"); // 60 per minute

router.post("/posts/:id/like", reactionRateLimiter, forumController.toggleLike);
router.post("/posts/:id/save", reactionRateLimiter, forumController.toggleSave);

// Polls
const voteRateLimiter = rateLimitMiddleware(20, 60, "forum:votes");
router.post(
  "/polls/:id/vote",
  voteRateLimiter,
  validate(schemas.votePollSchema),
  forumController.votePoll
);

// Moderation
const reportRateLimiter = rateLimitMiddleware(5, 3600, "forum:reports");
router.post(
  "/reports",
  reportRateLimiter,
  validate(schemas.reportSchema),
  forumController.reportContent
);

router.post(
  "/blocks",
  validate(schemas.blockProfileSchema),
  forumController.blockProfile
);

export const forumRoutes = router;
