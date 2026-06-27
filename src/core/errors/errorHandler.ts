import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { logger } from "../../config/logger";

interface ErrorResponse {
  success: boolean;
  message: string;
  statusCode?: number;
  errors?: unknown;
  stack?: string;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const errorResponse: ErrorResponse = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  if (err instanceof AppError) {
    errorResponse.statusCode = err.statusCode;
    if (err.errors) {
      errorResponse.errors = err.errors;
    }
    if (process.env.NODE_ENV !== "production") {
      errorResponse.stack = err.stack;
    }
  } else {
    logger.error(err, "Unhandled error");
    errorResponse.statusCode = 500;
    if (process.env.NODE_ENV !== "production") {
      errorResponse.stack = err.stack;
    }
  }

  const statusCode = (err as AppError).statusCode || 500;
  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
}
