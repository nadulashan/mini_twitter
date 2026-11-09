import type { Response } from "express";

type PostgresError = {
    code: string;
    constraint?: string;
};

function isPostgresError(error: unknown): error is PostgresError {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof error.code === "string"
    );
}

export default function handleDatabaseError(
    error: unknown,
    res: Response,
    fallbackMessage: string
) {
    if (
        isPostgresError(error) &&
        error.code === "23505" &&
        error.constraint === "unique_email"
    ) {
        return res.status(409).json({
            message: "An account with this email already exists."
        });
    }

    console.error("Database operation failed:", error);

    return res.status(500).json({
        message: fallbackMessage
    });
}