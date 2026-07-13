import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import * as examsController from "./exams.controller";
import { getExamsSchema } from "./exams.schema";
import "./exams.openapi";

const router = Router();

router.get("/:countryId", validate(getExamsSchema), examsController.getEducationNodesByCountry);

export default router;
