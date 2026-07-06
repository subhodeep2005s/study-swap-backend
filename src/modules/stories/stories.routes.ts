import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import * as storiesController from "./stories.controller";
import { storySchema, viewStorySchema } from "./stories.schema";
import "./stories.openapi";

const router = Router();

router.use(authMiddleware);
router.post("/", validate(storySchema), storiesController.uploadStory);
router.delete("/", storiesController.deleteStory);
router.get("/views", storiesController.getStoryViews);
router.get("/me", storiesController.getMyStory);
router.post("/:userId/view", validate(viewStorySchema), storiesController.viewStory);

export default router;
