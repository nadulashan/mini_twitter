import pool from "../db.js"
import type { Request, Response } from 'express'

export async function getAllUsers( req:Request, res: Response){
    try{
        const result = await pool.query(
            "SELECT id, username, email, created_at FROM users;"
        )
        res.status(200).json(result.rows)
    } catch ( e ) {
        console.error(e)
        res.status(500).json({
            message: "Server could not fetch users."
        })
    }

}