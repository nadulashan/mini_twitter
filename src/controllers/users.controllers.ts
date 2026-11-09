import pool from "../db.js"
import type { Request, Response } from 'express'
import handleDatabaseError from "../utils/handleDatabaseError.js"

export async function getAllUsers( req:Request, res: Response){
    try{
        const result = await pool.query(
            "SELECT id, username FROM users;"
        )
        res.status(200).json(result.rows)
    } catch ( e ) {
        handleDatabaseError( e, res, "fetching all users.")
    }

}