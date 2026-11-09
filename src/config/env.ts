import "dotenv/config";

const requiredVariables = [
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "SECRET_KEY"
] as const;

// Check required variables
for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        throw new Error(`Missing required environment variable: ${variable}`);
    }
}

// Validate ports
function validatePort(name: string, value: string | undefined): number {
    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`${name} must be a valid port number (1-65535).`);
    }

    return port;
}

const DB_PORT = validatePort("DB_PORT", process.env.DB_PORT);

const PORT = process.env.PORT
    ? validatePort("PORT", process.env.PORT)
    : 4000;

// Validate session secret
if (process.env.SECRET_KEY!.length < 32) {
    throw new Error("SECRET_KEY must contain at least 32 characters.");
}

// Export validated configuration
export const env = {
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_HOST: process.env.DB_HOST!,
    DB_PORT,
    DB_NAME: process.env.DB_NAME!,
    SECRET_KEY: process.env.SECRET_KEY!,
    PORT,
    ENABLE_DEV_ROUTES: process.env.ENABLE_DEV_ROUTES === "true",
    NODE_ENV: process.env.NODE_ENV ?? "development"
};