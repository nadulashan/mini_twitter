import "dotenv/config";
import pool from "./db.js";
import express from "express";
import argon2 from "argon2";

const app = express();

const PORT = 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

// Get all the users
app.get("/api/users", async ( req, res ) => {
  
  const result = await pool.query(
    "SELECT * FROM users;"
  )
  res.status(200).json(result.rows)

})

// get all posts
app.get("/api/test-db", async (req, res) => {
   
  const result = await pool.query(`
    SELECT
      posts.id,
      posts.content,
      posts.created_at,
      users.username AS author
    FROM posts
    JOIN users
      ON posts.user_id = users.id
    ORDER BY posts.created_at DESC;
  `);
  console.log(result)
  res.status(200).json(result.rows)

});


// Insert new post
app.post("/api/posts", async ( req, res ) => {

  try {
    
    const { user_id, content } = req.body;
    console.log(user_id, content)
    if ( !user_id || !content ){
      return res.status(400).json({
        message: 'Both content and author must be present.'
      })
    }

    const result = await pool.query(`
        INSERT INTO posts ( content, user_id ) 
        VALUES ( $1, $2 )
        RETURNING *;
      `, [ content, user_id ])
    
      res.status(200).json(result.rows[0])

  } catch ( e ) {

    console.error(e)

    res.status(500).json({
      message: "Database error"
    })

  }

})

// Add new user
app.post( "/api/auth/register", async ( req, res ) => {

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
        RETURNING ( id, username, email, created_at);
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

})


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});