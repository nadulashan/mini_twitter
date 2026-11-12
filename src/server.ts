import app from "./app.js";
import { env } from "./config/env.js";
import pool from "./db.js";

const server = app.listen(env.PORT, () => {
    console.log(`Server running at http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received. Starting graceful shutdown...`);

    server.close(async (error) => {
        if (error) {
            console.error("Error closing HTTP server:", error);
            process.exitCode = 1;
        }

        try {
            await pool.end();
            console.log("PostgreSQL connection pool closed.");
        } catch (error) {
            console.error("Error closing PostgreSQL pool:", error);
            process.exitCode = 1;
        }
    });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));