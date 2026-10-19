import type { Request, Response } from "express";
import argon2 from "argon2";
import pool from "../db.js";
import { recordIpFailure, resetIpLoginFailure, wait } from "../security/loginProtection.js";

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=65536,p=4,t=3$Rlj6EmwwM/QFMrR/EANfDg$54LNiyeNrwhgEHsxxrZ+QSjBYYTnJb3pbWkr26gYvgg"


export async function register(req: Request, res: Response) {
  try {

    const { username, email, password } = req.body;

    // Validate data
    if (
      typeof username !== "string" || 
      typeof password !== "string" || 
      typeof email !== "string" ||
      !username.trim() ||
      !password.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Username, Password and Email cannot be blank. Password must at least contain 8 characters"
      })
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const password_hash = await argon2.hash(password)

    // Pass data on to the database
    const result = await pool.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ( $1, $2, $3 )
        RETURNING id, username, email, created_at;
      `, [ cleanUsername, cleanEmail, password_hash ])
      
    res.status(201).json(result.rows[0])

  } catch (e: any) {

    if ( e.code === "23505" ){
      res.status(409).json({
        message: "An account with this email already exist."
      })
    }

    console.error(e)
    res.status(500).json({
      message:'Database error'
    })

  }

}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate uesr input data
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return res.status(400).json({
        message: "Invalied email or password."
      })
    }

    const normalisedEmail = email.trim().toLowerCase();
    
    // Fetch Hash password
    const result = await pool.query(`
        SELECT password_hash, id
        FROM users
        WHERE email=$1;
      `, [ normalisedEmail ]);

    
    const user = result.rows[0]

    const hashToVerify = user? user.password_hash : DUMMY_PASSWORD_HASH
      
    const isPasswordCorrect = await argon2.verify(hashToVerify, password)

    const authenticated = Boolean( isPasswordCorrect && user )

    const userId: number | undefined = authenticated? result.rows[0].id : undefined

    if ( !authenticated ) {

      const delayMs = recordIpFailure( req.ip!, normalisedEmail )

      if ( delayMs > 0 ){
        await wait( delayMs )
      }

      return res.status(401).json({
        message: "Invalied Email or Password"
      })
    }

    // Reset failiure counters
    resetIpLoginFailure( req.ip!, normalisedEmail )

    // Create session
    req.session.userId = userId;

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          message: "Failed to create session."
        });
      }

      return res.status(200).json({
        message: "Authentication successful."
      });
    });

  } catch (e) {

    console.error(e)
    res.status(500).json({
      message:"Server Error"
    })

  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {

    const result = await pool.query(`
        SELECT username, email, created_at
        FROM users
        WHERE id=$1
      `, [ req.session.userId ])

    if ( !result.rows[0] ){
      return res.status(400).json({
        message: "Cannot find user account. It may have been deleted."
      })
    }

    return res.status(200).json(result.rows[0])

  } catch (e) {
    console.error(e)
    return res.status(500).json("Server error")
  }

}

export async function logout(req: Request, res: Response) {
   req.session.destroy( err => {
    if ( err ) {
      console.error(err)

      return res.status(500).json({
        message: "Failed to Log out"
      })
    }

    res.clearCookie("connect.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    })

    return res.status(200).json({
      message: "Successfully logged out"
    })
  })

}