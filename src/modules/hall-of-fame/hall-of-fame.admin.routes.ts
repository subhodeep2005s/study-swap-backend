import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as AdminHallOfFameController from "./hall-of-fame.admin.controller";
import { 
  createHallOfFameSchema, 
  updateHallOfFameSchema, 
  getAdminHallOfFameSchema 
} from "./hall-of-fame.schema";

const router = Router();

// =========================================================================
// Admin Authentication
// =========================================================================
router.use(authMiddleware);
router.use(rbacMiddleware(["admin"]));

// =========================================================================
// Stats
// =========================================================================
router.get("/stats", AdminHallOfFameController.getAdminStats);

// =========================================================================
// CRUD
// =========================================================================
router.get("/", validate(getAdminHallOfFameSchema), AdminHallOfFameController.getAdminStories);
router.post("/", validate(createHallOfFameSchema), AdminHallOfFameController.createStory);

router.get("/:id", AdminHallOfFameController.getAdminStoryById);
router.patch("/:id", validate(updateHallOfFameSchema), AdminHallOfFameController.updateStory);
router.delete("/:id", AdminHallOfFameController.deleteStory);

// =========================================================================
// Lifecycle Management
// =========================================================================
router.post("/:id/restore", AdminHallOfFameController.restoreStory);
router.post("/:id/publish", AdminHallOfFameController.publishStory);
router.post("/:id/unpublish", AdminHallOfFameController.unpublishStory);

router.post("/:id/feature", AdminHallOfFameController.featureStory);
router.delete("/:id/feature", AdminHallOfFameController.unfeatureStory);

// =========================================================================
// Comments Management
// =========================================================================
router.get("/:id/comments", AdminHallOfFameController.adminGetComments);
router.delete("/comments/:commentId", AdminHallOfFameController.adminDeleteComment); // Assuming storyId doesn't matter here or can pass through generic endpoint

export default router;
