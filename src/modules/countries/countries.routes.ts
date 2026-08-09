import { Router } from "express";
import * as countriesController from "./countries.controller";
import "./countries.openapi";

const router = Router();

router.get("/", countriesController.getCountries);
router.get("/:countryCode/states", countriesController.getStates);
router.get("/:countryId/exams", countriesController.getExams);

export default router;
