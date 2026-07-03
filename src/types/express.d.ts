export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "admin" | "student" | "mentor";
        emailVerified: boolean;
        onboardingCompleted: boolean;
      };
    }
  }
}
