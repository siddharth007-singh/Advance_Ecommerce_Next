import { NextFunction, Request, Response } from "express";
import { jwtVerify, JWTPayload } from "jose";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res
      .status(401)
      .json({ success: false, error: "Access token not found" });
  }

  try {
    const { payload } = await jwtVerify(
      accessToken,
      new TextEncoder().encode(process.env.JWT_SECRET!)
    );

    const typedPayload = payload as JWTPayload & {
      userId: string;
      email: string;
      role: string;
    };

    req.user = {
      userId: typedPayload.userId,
      email: typedPayload.email,
      role: typedPayload.role,
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res
      .status(401)
      .json({ success: false, error: "Invalid or expired access token" });
  }
};


export const isSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "superadmin") {
    next();
  }
    else {
      return res
        .status(403)
        .json({ success: false, error: "Access denied" });
    }
}