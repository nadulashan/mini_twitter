import type { Request, Response, NextFunction } from "express";

export default function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "User not logged in",
    });
  }

  next();
}