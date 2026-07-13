import { Router } from "express";
import { validate } from "@/core/middleware/validate.middleware";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import * as onboardingController from "./onboarding.controller";
import { countrySchema, profileSchema, educationNodesSchema, studySchema, preferencesSchema, enhanceBioSchema, mentorApplicationSchema } from "./onboarding.schema";
import "./onboarding.openapi";

const router = Router();

router.use(authMiddleware);

router.get("/status", onboardingController.getStatus);
router.post("/country", validate(countrySchema), onboardingController.saveCountry);
router.patch("/profile", validate(profileSchema), onboardingController.updateProfile);
router.get("/education-nodes", onboardingController.getEducationNodes);
router.patch("/education-nodes", validate(educationNodesSchema), onboardingController.saveEducationNodes);
router.patch("/study", validate(studySchema), onboardingController.saveStudyDetails);
router.patch("/preferences", validate(preferencesSchema), onboardingController.savePreferences);
router.post("/complete", onboardingController.completeOnboarding);
router.post("/enhance-bio", validate(enhanceBioSchema), onboardingController.enhanceBio);
router.post("/mentor-application", validate(mentorApplicationSchema), onboardingController.applyForMentor);

export default router;
