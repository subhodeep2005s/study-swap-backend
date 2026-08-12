import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "@/core/middleware/auth.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as HallOfFameController from "./hall-of-fame.controller";
import { 
  getPublicHallOfFameSchema, 
  createCommentSchema, 
  updateCommentSchema 
} from "./hall-of-fame.schema";

import "./hall-of-fame.openapi";

const router = Router();

// =========================================================================
// Public / Authenticated Discovery
// =========================================================================
// Can be accessed without auth, but passing token helps with recommendations and interactions
router.get("/", optionalAuthMiddleware, validate(getPublicHallOfFameSchema), HallOfFameController.getPublicStories);
router.get("/featured", HallOfFameController.getFeaturedStories);
router.get("/trending", HallOfFameController.getTrendingStories);
router.get("/filters", HallOfFameController.getFilters);

// Require auth for personalized recommendations
router.get("/recommended", authMiddleware, HallOfFameController.getRecommendedStories);

// Require auth for saved stories
router.get("/saved", authMiddleware, HallOfFameController.getSavedStories);

// Story Details & Comments
router.get("/:id", optionalAuthMiddleware, HallOfFameController.getStoryById);
router.get("/:id/comments", HallOfFameController.getComments);

// =========================================================================
// Authenticated Interactions
// =========================================================================
router.use(authMiddleware);

router.post("/:id/view", HallOfFameController.recordView);

router.post("/:id/like", HallOfFameController.likeStory);
router.delete("/:id/like", HallOfFameController.unlikeStory);

router.post("/:id/helpful", HallOfFameController.markHelpful);
router.delete("/:id/helpful", HallOfFameController.unmarkHelpful);

router.post("/:id/save", HallOfFameController.saveStory);
router.delete("/:id/save", HallOfFameController.unsaveStory);

router.post("/:id/comments", validate(createCommentSchema), HallOfFameController.createComment);
router.patch("/comments/:commentId", validate(updateCommentSchema), HallOfFameController.updateComment);
router.delete("/:id/comments/:commentId", HallOfFameController.deleteComment);

export default router;
