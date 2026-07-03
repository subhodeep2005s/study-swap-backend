import { Router } from "express";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { rbacMiddleware } from "@/core/middleware/rbac.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import * as matchesController from "./matches.controller";
import { matchIdSchema } from "./matches.schema";
import "./matches.openapi";

const router = Router();

// Every endpoint requires JWT authentication and only 'student' can access
router.use(authMiddleware);
router.use(rbacMiddleware(["student"]));

router.get("/", matchesController.getPendingMatches);
router.get("/saved", matchesController.getSavedMatches);
router.get("/accepted", matchesController.getAcceptedMatches);
router.get("/mymatches", matchesController.getAcceptedMatches);
router.get("/chats", matchesController.getAcceptedMatches);
router.get("/:id", matchesController.getMatchById);

router.post("/refresh", matchesController.refreshMatches);

router.patch("/:id/accept", validate(matchIdSchema), matchesController.acceptMatch);
router.patch("/:id/reject", validate(matchIdSchema), matchesController.rejectMatch);
router.patch("/:id/save", validate(matchIdSchema), matchesController.saveMatch);


router.delete("/:id", validate(matchIdSchema), matchesController.removeMatch);

export default router;
