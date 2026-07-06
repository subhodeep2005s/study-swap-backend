import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as countriesService from "./countries.service";

export const getCountries = asyncHandler(async (_req: Request, res: Response) => {
  const data = await countriesService.getCountries();
  res.status(200).json({
    success: true,
    message: "Countries fetched successfully",
    data,
  });
});

export const getStates = asyncHandler(async (req: Request<{ countryCode: string }>, res: Response) => {
  const data = await countriesService.getStatesByCountry(req.params.countryCode);
  res.status(200).json({
    success: true,
    message: "States fetched successfully",
    data,
  });
});
