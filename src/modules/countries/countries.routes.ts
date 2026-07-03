import { Router } from "express";
import * as countriesController from "./countries.controller";
import "./countries.openapi";

const router = Router();

router.get("/", countriesController.getCountries);
router.get("/:countryCode/states", countriesController.getStates);

export default router;
