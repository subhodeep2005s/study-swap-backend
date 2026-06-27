import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export interface JWTPayload {
  id: string;
  email: string;
  role: "admin" | "user";
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}
