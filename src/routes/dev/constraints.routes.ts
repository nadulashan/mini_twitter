import { Router, Request, Response } from "express";
import pool from "../../db.js";

const constraintsRoutes = Router()

constraintsRoutes.post("/constraints", async ( req: Request, res: Response) => {
    console.log("dev route runs!")
    try {
    await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)`,
      ["", "existing@email.com", "fakehash"]
    );

    return res.json({ message: "Inserted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Database error" });
  }
})

export default constraintsRoutes