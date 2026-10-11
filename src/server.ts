import "dotenv/config";
import pool from "./db.js";
import express from "express";

const app = express();

const PORT = 3000;

// Middleware: parse incoming JSON request bodies
app.use(express.json());

app.get("/api/users", async ( req, res ) => {
  
  const result = await pool.query(
    "SELECT * FROM users;"
  )
  res.status(200).json(result.rows)

})

// Our first API endpoint
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


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});