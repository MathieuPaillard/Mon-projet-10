import "express";
import type { AuthTokenPayload } from "../auth/jwt.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}
