import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import * as examsService from "./exams.service";
import type { GetExamsInput } from "./exams.schema";

export const getEducationNodesByCountry = asyncHandler(async (req: Request<GetExamsInput>, res: Response) => {
    const data = await examsService.getEducationNodesByCountry(req.params.countryId);
    res.status(200).json({
      success: true,
      message: "Education nodes fetched successfully",
      data,
    });
});
