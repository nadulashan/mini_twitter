import type { Request, Response, NextFunction } from "express";

export default function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    console.log('This runs')
    return res.status(401).json({
      message: "User not logged in",
    });
  }
  console.log("this shouldn't")

  next();
}