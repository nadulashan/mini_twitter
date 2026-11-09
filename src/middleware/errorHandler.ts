import type { Request, Response, NextFunction } from "express";

export default function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error("Unhandled error:", err);

    return res.status(500).json({
        message: "Internal server error."
    });
}