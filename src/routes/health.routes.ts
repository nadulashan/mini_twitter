import { Router } from "express";
import pool from "../db.js";

const healthRoutes = Router();

// Liveness check
healthRoutes.get("/live", (req, res) => {
    return res.status(200).json({
        status: "ok"
    });
});

// Readiness check
healthRoutes.get("/ready", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.status(200).json({
            status: "ok",
            database: "connected"
        });
    } catch (error) {
        console.error("Readiness check failed:", error);

        return res.status(503).json({
            status: "error",
            database: "unavailable"
        });
    }
});

export default healthRoutes;